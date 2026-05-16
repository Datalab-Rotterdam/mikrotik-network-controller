import { ServiceManager, type Service } from '@sourceregistry/sveltekit-service-manager/server';
import { deviceEvents } from '$lib/server/services/devices.service/emitter';
import { schedulerEvents } from '$lib/server/services/scheduler.service';
import { SyslogRepository } from '$lib/server/repositories/syslog.repository';
import { JobRepository } from '$lib/server/repositories/job.repository';
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import '$lib/server/services/actionbus.service';
import { Service as Svc } from '@sourceregistry/sveltekit-service-manager';
import { siteChannel } from '$lib/server/services/actionbus.service';

// Track last known status per device to detect transitions only
const lastStatus = new Map<string, string>();

function formatJobName(type: string): string {
	return type
		.replace(/^devices\./, '')
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function writeEvent(input: {
	siteId: string;
	deviceId: string | null;
	severity: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';
	category: string;
	title: string;
	message: string;
	metadata?: Record<string, unknown>;
}) {
	try {
		const row = await SyslogRepository.insert({
			siteId: input.siteId,
			deviceId: input.deviceId ?? undefined,
			severity: input.severity,
			category: input.category,
			title: input.title,
			message: input.message,
			metadata: input.metadata ?? {}
		});

		Svc('actionbus').publish(siteChannel(input.siteId), {
			type: 'syslog.event',
			payload: {
				siteId: input.siteId,
				id: row.id,
				severity: row.severity,
				category: row.category,
				title: row.title,
				message: row.message,
				deviceId: row.deviceId ?? null,
				createdAt: row.createdAt.toISOString()
			}
		});
	} catch {
		// Fire-and-forget â€” never block device operations
	}
}

function startDeviceListeners() {
	deviceEvents.on('device.updated', async (payload) => {
		const { deviceId, siteId, connectionStatus, reason } = payload;
		if (!siteId) return;

		const prev = lastStatus.get(deviceId);
		const current = connectionStatus ?? 'unknown';

		// Only log status transitions, not every telemetry tick
		if (prev === current) return;
		lastStatus.set(deviceId, current);

		// Skip first-seen (no previous) for online â€” suppress startup noise
		if (!prev && current === 'online') {
			lastStatus.set(deviceId, current);
			return;
		}

		const device = await TelemetryRepository.getDeviceById(deviceId).catch(() => null);
		const deviceName = device?.identity ?? device?.name ?? deviceId;

		if (current === 'online') {
			await writeEvent({
				siteId,
				deviceId,
				severity: 'info',
				category: 'device',
				title: 'Device online',
				message: `${deviceName} is now reachable`,
				metadata: { reason, host: device?.host }
			});
		} else if (current === 'offline') {
			await writeEvent({
				siteId,
				deviceId,
				severity: 'warning',
				category: 'device',
				title: 'Device offline',
				message: `${deviceName} is not reachable`,
				metadata: { host: device?.host }
			});
		} else if (current === 'auth_failed') {
			await writeEvent({
				siteId,
				deviceId,
				severity: 'error',
				category: 'security',
				title: 'Authentication failed',
				message: `${deviceName} rejected credentials`,
				metadata: { host: device?.host }
			});
		}
	});

	deviceEvents.on('device.adopted', async (payload) => {
		const { deviceId, siteId, identity, host } = payload;
		if (!siteId) return;

		await writeEvent({
			siteId,
			deviceId,
			severity: 'notice',
			category: 'adopt',
			title: 'Device adopted',
			message: `${identity ?? host} was added to the inventory`,
			metadata: { host, identity }
		});
	});

	deviceEvents.on('device.removed', async (payload) => {
		const { deviceId, siteId } = payload;
		if (!siteId) return;
		lastStatus.delete(deviceId);

		await writeEvent({
			siteId,
			deviceId,
			severity: 'notice',
			category: 'device',
			title: 'Device removed',
			message: `Device was removed from the site`,
			metadata: {}
		});
	});
}

function startSchedulerListeners() {
	schedulerEvents.on('job:succeeded', async (detail) => {
		const job = await JobRepository.get(detail.jobId).catch(() => null);
		if (!job?.siteId) return;

		await writeEvent({
			siteId: job.siteId,
			deviceId: job.deviceId ?? null,
			severity: 'info',
			category: 'system',
			title: `${formatJobName(job.type)} completed`,
			message: detail.message ?? `Job finished successfully`,
			metadata: { jobId: job.id, jobType: job.type }
		});
	});

	schedulerEvents.on('job:failed', async (detail) => {
		const job = await JobRepository.get(detail.jobId).catch(() => null);
		if (!job?.siteId) return;

		await writeEvent({
			siteId: job.siteId,
			deviceId: job.deviceId ?? null,
			severity: 'error',
			category: 'system',
			title: `${formatJobName(job.type)} failed`,
			message: detail.message ?? `Job failed`,
			metadata: { jobId: job.id, jobType: job.type }
		});
	});

	schedulerEvents.on('job:rolling_back', async (detail) => {
		const job = await JobRepository.get(detail.jobId).catch(() => null);
		if (!job?.siteId) return;

		await writeEvent({
			siteId: job.siteId,
			deviceId: job.deviceId ?? null,
			severity: 'warning',
			category: 'system',
			title: `${formatJobName(job.type)} rolling back`,
			message: detail.message ?? `Job is rolling back changes`,
			metadata: { jobId: job.id, jobType: job.type }
		});
	});
}

export const service = {
	name: 'syslog',
	local: {
		start() {
			startDeviceListeners();
			startSchedulerListeners();
		}
	}
} satisfies Service<'syslog'>;

export type SyslogService = typeof service;

export default ServiceManager.Load(service, import.meta);

