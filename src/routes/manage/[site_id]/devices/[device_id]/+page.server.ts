import { error, type Actions } from '@sveltejs/kit';
import { getDeviceByIdForSite } from '$lib/server/repositories/device.repository';
import { getJobWithSteps, listJobsByDevice } from '$lib/server/repositories/job.repository';
import { getActiveCredential, listDeviceInterfaces } from '$lib/server/repositories/telemetry.repository';
import { resolveDeviceImage } from '$lib/server/services/device-image-catalog.service';
import { isDeviceTerminalEligible } from '$lib/server/services/device-terminal.service';
import type { ActionJob, ActionJobStep } from '$lib/shared/action-events';
import { provisionDeviceAction, removeDeviceAction } from '../device-actions.server';

export const actions: Actions = {
	provision: provisionDeviceAction,
	remove: removeDeviceAction
};

function serializeDate(value: Date | string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeStep(
	step: NonNullable<Awaited<ReturnType<typeof getJobWithSteps>>>['steps'][number]
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

function serializeJob(job: NonNullable<Awaited<ReturnType<typeof getJobWithSteps>>>): ActionJob {
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

export async function load({ locals, parent, params, depends }) {
	const { site } = await parent();
	const deviceId = params.device_id as string;
	depends?.(`app:site-devices:${site.id}`);
	depends?.(`app:device:${deviceId}`);

	const device = await getDeviceByIdForSite(deviceId, site.id);

	if (!device) {
		throw error(404, 'Device not found');
	}

	const [interfaces, recentJobs, writeCredential] = await Promise.all([
		listDeviceInterfaces(device.id),
		listJobsByDevice(device.id, 20),
		getActiveCredential(device.id, 'write')
	]);
	const hydratedJobs = await Promise.all(recentJobs.map((job) => getJobWithSteps(job.id)));

	return {
		device,
		deviceImage: resolveDeviceImage(device.model ?? device.identity ?? device.name, device.platform),
		interfaces,
		terminalAvailable: isDeviceTerminalEligible({
			userRoles: locals?.user?.roles ?? [],
			device,
			writeCredential
		}),
		jobs: hydratedJobs
			.filter((job): job is NonNullable<Awaited<ReturnType<typeof getJobWithSteps>>> => Boolean(job))
			.map(serializeJob)
	};
}
