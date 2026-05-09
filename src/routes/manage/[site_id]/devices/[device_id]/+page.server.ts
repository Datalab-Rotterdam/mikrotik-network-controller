import { error, fail, type Actions } from '@sveltejs/kit';
import { getDeviceByIdForSite } from '$lib/server/repositories/device.repository';
import { getJobWithSteps, listJobsByDevice } from '$lib/server/repositories/job.repository';
import { getActiveCredential, listDeviceInterfaces } from '$lib/server/repositories/telemetry.repository';
import { resolveDeviceImage } from '$lib/server/services/device-image-catalog.service';
import { isDeviceTerminalEligible } from '$lib/server/services/device-terminal.service';
import { getInterfaceMetricsHistory } from '$lib/server/repositories/metrics.repository';
import { getDeviceBackups } from '$lib/server/services/backup.service';
import { Service } from '@sourceregistry/sveltekit-service-manager';
import { createBackupDeviceTask } from '$lib/server/services/devices.service/modules/provisioning/tasks';
import { createFirmwareCheckTask, createFirmwareUpgradeTask } from '$lib/server/services/firmware.service';
import { getFirmwareVersion } from '$lib/server/repositories/firmware.repository';
import type { ActionJob, ActionJobStep } from '$lib/shared/action-events';
import { provisionDeviceAction, removeDeviceAction } from '../device-actions.server';

export const actions: Actions = {
	provision: provisionDeviceAction,
	remove: removeDeviceAction,
	backup: async ({ params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		try {
			const job = await Service('scheduler').schedule(createBackupDeviceTask(deviceId, siteId));
			return { success: true, message: 'Backup queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	},
	firmwareCheck: async ({ params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		try {
			const job = await Service('scheduler').schedule(createFirmwareCheckTask(deviceId, siteId));
			return { success: true, message: 'Firmware check queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	},
	firmwareUpgrade: async ({ params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		try {
			const job = await Service('scheduler').schedule(createFirmwareUpgradeTask(deviceId, siteId));
			return { success: true, message: 'Firmware upgrade queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}
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

type IfaceRow = { interfaceName: string; collectedAt: Date; rxBytes: number | null; txBytes: number | null };
type IfaceSample = { t: number; rx: number; tx: number };

function computeIfaceTraffic(rows: IfaceRow[]): Record<string, IfaceSample[]> {
	const grouped = new Map<string, IfaceRow[]>();
	for (const row of rows) {
		const arr = grouped.get(row.interfaceName) ?? [];
		arr.push(row);
		grouped.set(row.interfaceName, arr);
	}

	const result: Record<string, IfaceSample[]> = {};
	for (const [name, samples] of grouped) {
		// samples already ordered by collectedAt ASC from the query
		const deltas: IfaceSample[] = [];
		for (let i = 1; i < samples.length; i++) {
			const prev = samples[i - 1];
			const curr = samples[i];
			const dtMs = new Date(curr.collectedAt).getTime() - new Date(prev.collectedAt).getTime();
			if (dtMs <= 0) continue;
			const dtS = dtMs / 1000;
			const rxPrev = prev.rxBytes ?? 0;
			const rxCurr = curr.rxBytes ?? 0;
			const txPrev = prev.txBytes ?? 0;
			const txCurr = curr.txBytes ?? 0;
			// guard against counter resets
			const rx = rxCurr >= rxPrev ? (rxCurr - rxPrev) / dtS : 0;
			const tx = txCurr >= txPrev ? (txCurr - txPrev) / dtS : 0;
			deltas.push({ t: new Date(curr.collectedAt).getTime(), rx, tx });
		}
		// only include interfaces with any traffic or at least 2 samples
		if (deltas.length > 0) {
			result[name] = deltas;
		}
	}
	return result;
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

	const [interfaces, recentJobs, writeCredential, rawIfaceMetrics, backups, firmware] = await Promise.all([
		listDeviceInterfaces(device.id),
		listJobsByDevice(device.id, 20),
		getActiveCredential(device.id, 'write'),
		getInterfaceMetricsHistory(device.id, 60 * 60 * 1000), // last 1h
		getDeviceBackups(device.id),
		getFirmwareVersion(device.id)
	]);
	const hydratedJobs = await Promise.all(recentJobs.map((job) => getJobWithSteps(job.id)));

	// Group interface metrics by name and compute per-interval deltas
	const ifaceTraffic = computeIfaceTraffic(rawIfaceMetrics);

	return {
		device,
		deviceImage: resolveDeviceImage(device.model ?? device.identity ?? device.name, device.platform),
		interfaces,
		ifaceTraffic,
		backups,
		firmware,
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
