import { EventEmitter } from 'node:events';
import { Router, type Service, ServiceManager } from '@sourceregistry/sveltekit-service-manager';
import {
	createJob,
	getJob,
	listRecentJobs,
	listRunningJobs,
	markJobFinished,
	markJobRollingBack,
	markJobRunning,
	updateJob
} from '$lib/server/repositories/job.repository';
import {
	createJobSteps,
	listJobSteps,
	updateJobStep
} from '$lib/server/repositories/job-step.repository';
import type {
	SchedulerEventDetail,
	SchedulerEventName,
	StepResult,
	TaskDefinition,
	TaskStep
} from './types';

const router = Router();

export const schedulerEvents = new EventEmitter();

function errorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function resultToRecord(result: StepResult | void): Record<string, unknown> {
	if (!result) {
		return {};
	}

	return {
		...(result.message ? { message: result.message } : {}),
		...(result.data ?? {})
	};
}

function emit(event: SchedulerEventName, detail: SchedulerEventDetail): void {
	schedulerEvents.emit(event, detail);
}

export class ScheduledTask extends EventEmitter {
	readonly id: string;

	constructor(id: string) {
		super();
		this.id = id;
	}

	emitSchedulerEvent(event: SchedulerEventName, detail: SchedulerEventDetail): void {
		this.emit(event, detail);
		emit(event, detail);
	}
}

async function rollbackCompletedSteps<TPayload extends Record<string, unknown>>(
	task: TaskDefinition<TPayload>,
	handle: ScheduledTask,
	jobId: string,
	completedSteps: Array<{
		row: Awaited<ReturnType<typeof createJobSteps>>[number];
		definition: TaskStep<TPayload>;
	}>
): Promise<boolean> {
	let rollbackFailed = false;

	for (const completed of completedSteps.reverse()) {
		const detail = {
			jobId,
			stepId: completed.row.id,
			stepIndex: completed.row.index,
			stepName: completed.row.name
		};

		if (!completed.definition.revert || completed.definition.revertPolicy === 'none') {
			await updateJobStep(completed.row.id, {
				status: 'revert_skipped',
				revertedAt: new Date()
			});
			handle.emitSchedulerEvent('step:revert_skipped', detail);
			continue;
		}

		await updateJobStep(completed.row.id, {
			status: 'reverting',
			revertedAt: new Date()
		});
		handle.emitSchedulerEvent('step:reverting', detail);

		try {
			const result = await completed.definition.revert({
				jobId,
				payload: task.payload ?? ({} as TPayload),
				stepId: completed.row.id,
				stepIndex: completed.row.index,
				stepName: completed.row.name,
				emit: (event, eventDetail) => handle.emitSchedulerEvent(event, eventDetail)
			});

			await updateJobStep(completed.row.id, {
				status: 'reverted',
				revertResult: resultToRecord(result),
				revertedAt: new Date()
			});
			handle.emitSchedulerEvent('step:reverted', detail);
		} catch (error) {
			const message = errorMessage(error);
			rollbackFailed = true;
			await updateJobStep(completed.row.id, {
				status: 'revert_failed',
				revertErrorMessage: message,
				revertedAt: new Date()
			});
			handle.emitSchedulerEvent('step:revert_failed', {
				...detail,
				message
			});

			if (completed.definition.revertPolicy === 'required') {
				break;
			}
		}
	}

	return rollbackFailed;
}

async function runTask<TPayload extends Record<string, unknown>>(
	task: TaskDefinition<TPayload>,
	handle: ScheduledTask
): Promise<void> {
	const jobId = handle.id;
	const payload = task.payload ?? ({} as TPayload);
	const steps = await listJobSteps(jobId);
	const completedSteps: Array<{
		row: (typeof steps)[number];
		definition: TaskStep<TPayload>;
	}> = [];

	await markJobRunning(jobId);
	handle.emitSchedulerEvent('job:started', { jobId });

	if (task.steps.length === 0) {
		await markJobFinished(jobId, 'succeeded', { progress: 100 });
		handle.emitSchedulerEvent('job:succeeded', { jobId });
		return;
	}

	for (const [index, step] of task.steps.entries()) {
		const row = steps[index];
		if (!row) {
			throw new Error(`Missing persisted step ${index} for job ${jobId}`);
		}

		const detail = {
			jobId,
			stepId: row.id,
			stepIndex: row.index,
			stepName: row.name
		};

		await updateJobStep(row.id, {
			status: 'running',
			startedAt: new Date()
		});
		handle.emitSchedulerEvent('step:started', detail);

		try {
			const result = await step.execute({
				jobId,
				payload,
				stepId: row.id,
				stepIndex: row.index,
				stepName: row.name,
				emit: (event, eventDetail) => handle.emitSchedulerEvent(event, eventDetail)
			});

			await updateJobStep(row.id, {
				status: 'succeeded',
				result: resultToRecord(result),
				finishedAt: new Date()
			});

			completedSteps.push({ row, definition: step });

			const progress = Math.round(((index + 1) / task.steps.length) * 100);
			await updateJob(jobId, { progress });
			handle.emitSchedulerEvent('step:succeeded', {
				...detail,
				data: resultToRecord(result)
			});
			continue;
		} catch (error) {
			const message = errorMessage(error);
			await updateJobStep(row.id, {
				status: 'failed',
				errorMessage: message,
				finishedAt: new Date()
			});
			handle.emitSchedulerEvent('step:failed', {
				...detail,
				message
			});

			if (task.failurePolicy === 'continue') {
				continue;
			}

			if (task.failurePolicy === 'stop') {
				await markJobFinished(jobId, 'failed', { errorMessage: message });
				handle.emitSchedulerEvent('job:failed', { jobId, message });
				return;
			}

			await markJobRollingBack(jobId, message);
			handle.emitSchedulerEvent('job:rolling_back', { jobId, message });

			const rollbackFailed = await rollbackCompletedSteps(task, handle, jobId, completedSteps);
			if (rollbackFailed) {
				await markJobFinished(jobId, 'revert_failed', { errorMessage: message });
				handle.emitSchedulerEvent('job:revert_failed', { jobId, message });
				return;
			}

			await markJobFinished(jobId, 'reverted', { errorMessage: message });
			handle.emitSchedulerEvent('job:reverted', { jobId, message });
			return;
		}
	}

	await markJobFinished(jobId, 'succeeded', { progress: 100 });
	handle.emitSchedulerEvent('job:succeeded', { jobId });
}

const scheduler = {
	async schedule<TPayload extends Record<string, unknown>>(
		task: TaskDefinition<TPayload>
	): Promise<ScheduledTask> {
		const job = await createJob({
			type: task.name,
			deviceId: task.deviceId ?? null,
			siteId: task.siteId ?? null,
			requestedByUserId: task.requestedByUserId ?? null,
			payload: task.payload ?? {},
			maxAttempts: task.maxAttempts ?? 1
		});

		await createJobSteps(
			task.steps.map((step, index) => ({
				jobId: job.id,
				index,
				name: step.name
			}))
		);

		const handle = new ScheduledTask(job.id);
		handle.emitSchedulerEvent('job:queued', { jobId: job.id });

		queueMicrotask(() => {
			void runTask(
				{
					...task,
					failurePolicy: task.failurePolicy ?? 'rollback'
				},
				handle
			).catch(async (error) => {
				const message = errorMessage(error);
				await markJobFinished(job.id, 'failed', { errorMessage: message });
				handle.emitSchedulerEvent('job:failed', { jobId: job.id, message });
			});
		});

		return handle;
	},

	async get(id: string) {
		const [job, steps] = await Promise.all([getJob(id), listJobSteps(id)]);
		return job ? { ...job, steps } : null;
	},

	async listRecent(limit?: number) {
		return listRecentJobs(limit);
	},

	async listRunning() {
		return listRunningJobs();
	}
};

export const service = {
	name: 'scheduler',
	route: router,
	local: scheduler
} satisfies Service<'scheduler'>;

export type SchedulerService = typeof service;

export default ServiceManager.Load(service, import.meta);
