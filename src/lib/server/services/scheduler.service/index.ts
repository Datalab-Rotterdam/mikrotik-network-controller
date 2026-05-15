import {
    AnyEventEmitter,
    type AnyEventListener,
    type EventArgs,
    type EventKey,
    type EventNames
} from "$lib/server/utilities/AnyEventEmitter";
import type {ActionJob, ActionJobStep} from "$lib/shared/action-events";
import {EventEmitter} from 'node:events';
import {Router, Service, ServiceManager} from '@sourceregistry/sveltekit-service-manager';
import '$lib/server/services/actionbus.service';
import {JobRepository} from '$lib/server/repositories/job.repository';
import {JobStepRepository} from '$lib/server/repositories/job-step.repository';
import type {
    SchedulerEventDetail,
    StepResult,
    TaskDefinition,
    TaskStep
} from './types';

const router = Router();

export type SchedulerEventMap = {
    'job:queued': [SchedulerEventDetail]
    'job:started': [SchedulerEventDetail]
    'job:succeeded': [SchedulerEventDetail]
    'job:failed': [SchedulerEventDetail]
    'job:rolling_back': [SchedulerEventDetail]
    'job:reverted': [SchedulerEventDetail]
    'job:revert_failed': [SchedulerEventDetail]
    'step:started': [SchedulerEventDetail]
    'step:succeeded': [SchedulerEventDetail]
    'step:failed': [SchedulerEventDetail]
    'step:reverting': [SchedulerEventDetail]
    'step:reverted': [SchedulerEventDetail]
    'step:revert_failed': [SchedulerEventDetail]
    'step:revert_skipped': [SchedulerEventDetail]
}

export const schedulerEvents = new AnyEventEmitter<SchedulerEventMap>();

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
        ...(result.message ? {message: result.message} : {}),
        ...(result.data ?? {})
    };
}

function serializeDate(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeStep(
    step: NonNullable<Awaited<ReturnType<typeof JobRepository.getWithSteps>>>['steps'][number]
): ActionJobStep {
    return {
        id: step.id,
        jobId: step.jobId,
        index: step.index,
        name: step.name,
        status: step.status,
        result: step.result,
        errorMessage: step.errorMessage,
        revertResult: step.revertResult ?? null,
        revertErrorMessage: step.revertErrorMessage,
        startedAt: serializeDate(step.startedAt),
        finishedAt: serializeDate(step.finishedAt),
        revertedAt: serializeDate(step.revertedAt),
        createdAt: serializeDate(step.createdAt) ?? new Date(0).toISOString(),
        updatedAt: serializeDate(step.updatedAt) ?? new Date(0).toISOString()
    };
}

function serializeJob(job: NonNullable<Awaited<ReturnType<typeof JobRepository.getWithSteps>>>): ActionJob {
    return {
        id: job.id,
        type: job.type,
        status: job.status,
        deviceId: job.deviceId,
        siteId: job.siteId,
        requestedByUserId: job.requestedByUserId,
        progress: job.progress,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
        payload: job.payload,
        result: job.result ?? null,
        errorMessage: job.errorMessage,
        scheduledFor: serializeDate(job.scheduledFor),
        lockedAt: serializeDate(job.lockedAt),
        lockedBy: job.lockedBy,
        startedAt: serializeDate(job.startedAt),
        finishedAt: serializeDate(job.finishedAt),
        createdAt: serializeDate(job.createdAt) ?? new Date(0).toISOString(),
        updatedAt: serializeDate(job.updatedAt) ?? new Date(0).toISOString(),
        steps: job.steps.map(serializeStep)
    };
}

const publishSchedulerEvent: AnyEventListener<SchedulerEventMap> = async (_eventName, detail) => {
    const job = await JobRepository.getWithSteps(detail.jobId).catch(() => null);
    if (!job || !job.siteId) return;
    Service('actionbus').publish(`site:${job.siteId}`, {
        type: 'job.updated',
        payload: {
            siteId: job.siteId,
            job: serializeJob(job)
        }
    })
};

export class ScheduledTask extends EventEmitter<SchedulerEventMap> {
    readonly id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }

    override emit<EventName extends EventKey>(
        eventName: EventNames<SchedulerEventMap, EventName>,
        ...args: EventArgs<SchedulerEventMap, EventName>
    ): boolean {
        const emitted = super.emit(eventName, ...args);
        schedulerEvents.emit(eventName, ...args as any);
        return emitted;
    }
}

async function rollbackCompletedSteps<TPayload extends Record<string, unknown>>(
    task: TaskDefinition<TPayload>,
    handle: ScheduledTask,
    jobId: string,
    completedSteps: Array<{
        row: Awaited<ReturnType<typeof JobStepRepository.createMany>>[number];
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
            await JobStepRepository.update(completed.row.id, {
                status: 'revert_skipped',
                revertedAt: new Date()
            });
            handle.emit('step:revert_skipped', detail);
            continue;
        }

        await JobStepRepository.update(completed.row.id, {
            status: 'reverting',
            revertedAt: new Date()
        });
        handle.emit('step:reverting', detail);

        try {
            const result = await completed.definition.revert({
                jobId,
                payload: task.payload ?? ({} as TPayload),
                stepId: completed.row.id,
                stepIndex: completed.row.index,
                stepName: completed.row.name,
                emit: (event, eventDetail) => handle.emit(event, eventDetail)
            });

            await JobStepRepository.update(completed.row.id, {
                status: 'reverted',
                revertResult: resultToRecord(result),
                revertedAt: new Date()
            });
            handle.emit('step:reverted', detail);
        } catch (error) {
            const message = errorMessage(error);
            rollbackFailed = true;
            await JobStepRepository.update(completed.row.id, {
                status: 'revert_failed',
                revertErrorMessage: message,
                revertedAt: new Date()
            });
            handle.emit('step:revert_failed', {
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
    const steps = await JobStepRepository.list(jobId);
    const completedSteps: Array<{
        row: (typeof steps)[number];
        definition: TaskStep<TPayload>;
    }> = [];

    await JobRepository.markRunning(jobId);
    handle.emit('job:started', {jobId});

    if (task.steps.length === 0) {
        await JobRepository.markFinished(jobId, 'succeeded', {progress: 100});
        handle.emit('job:succeeded', {jobId});
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

        await JobStepRepository.update(row.id, {
            status: 'running',
            startedAt: new Date()
        });
        handle.emit('step:started', detail);

        try {
            const result = await step.execute({
                jobId,
                payload,
                stepId: row.id,
                stepIndex: row.index,
                stepName: row.name,
                emit: (event, eventDetail) => handle.emit(event, eventDetail)
            });

            await JobStepRepository.update(row.id, {
                status: 'succeeded',
                result: resultToRecord(result),
                finishedAt: new Date()
            });

            completedSteps.push({row, definition: step});

            const progress = Math.round(((index + 1) / task.steps.length) * 100);
            await JobRepository.update(jobId, {progress});
            handle.emit('step:succeeded', {
                ...detail,
                data: resultToRecord(result)
            });
        } catch (error) {
            const message = errorMessage(error);
            await JobStepRepository.update(row.id, {
                status: 'failed',
                errorMessage: message,
                finishedAt: new Date()
            });
            handle.emit('step:failed', {
                ...detail,
                message
            });

            if (task.failurePolicy === 'continue') {
                continue;
            }

            if (task.failurePolicy === 'stop') {
                await JobRepository.markFinished(jobId, 'failed', {errorMessage: message});
                handle.emit('job:failed', {jobId, message});
                return;
            }

            await JobRepository.markRollingBack(jobId, message);
            handle.emit('job:rolling_back', {jobId, message});

            const rollbackFailed = await rollbackCompletedSteps(task, handle, jobId, completedSteps);
            if (rollbackFailed) {
                await JobRepository.markFinished(jobId, 'revert_failed', {errorMessage: message});
                handle.emit('job:revert_failed', {jobId, message});
                return;
            }

            await JobRepository.markFinished(jobId, 'reverted', {errorMessage: message});
            handle.emit('job:reverted', {jobId, message});
            return;
        }
    }

    await JobRepository.markFinished(jobId, 'succeeded', {progress: 100});
}

export const service = {
    name: 'scheduler',
    dependsOn: ['actionbus'],
    route: router,
    load: () => {
        schedulerEvents.any(publishSchedulerEvent);
    },
    cleanup: () => {
        schedulerEvents.removeAnyListener(publishSchedulerEvent);
    },
    local: {
        async schedule<TPayload extends Record<string, unknown>>(
            task: TaskDefinition<TPayload>
        ): Promise<ScheduledTask> {
            const job = await JobRepository.create({
                type: task.name,
                deviceId: task.deviceId ?? null,
                siteId: task.siteId ?? null,
                requestedByUserId: task.requestedByUserId ?? null,
                payload: task.payload ?? {},
                maxAttempts: task.maxAttempts ?? 1
            });

            await JobStepRepository.createMany(
                task.steps.map((step, index) => ({
                    jobId: job.id,
                    index,
                    name: step.name
                }))
            );

            const handle = new ScheduledTask(job.id);
            handle.emit('job:queued', {jobId: job.id});

            queueMicrotask(() => {
                void runTask(
                    {
                        ...task,
                        failurePolicy: task.failurePolicy ?? 'rollback'
                    },
                    handle
                ).catch(async (error) => {
                    const message = errorMessage(error);
                    await JobRepository.markFinished(job.id, 'failed', {errorMessage: message});
                    handle.emit('job:failed', {jobId: job.id, message});
                });
            });

            return handle;
        },

        async get(id: string) {
            const [job, steps] = await Promise.all([JobRepository.get(id), JobStepRepository.list(id)]);
            return job ? {...job, steps} : null;
        },

        async listRecent(limit?: number) {
            return JobRepository.listRecent(limit);
        },

        async listRunning() {
            return JobRepository.listRunning();
        }
    }
} satisfies Service<'scheduler'>;

export type SchedulerService = typeof service;

export default ServiceManager.Load(service, import.meta);
