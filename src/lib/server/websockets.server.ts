import { websockets } from '@sourceregistry/sveltekit-websockets/server';
import discoveryService from '$lib/server/services/discovery.service';
import { listDevices } from '$lib/server/repositories/device.repository';
import { adoptionEvents } from '$lib/server/services/adoption.service';
import { deviceEvents } from '$lib/server/services/device-events.service';
import { monitoringEvents } from '$lib/server/services/monitoring-events.service';
import { alertEvaluatorEvents } from '$lib/server/services/alert-evaluator.service';
import {
	getJobWithSteps,
	listRecentJobsBySite
} from '$lib/server/repositories/job.repository';
import { getLatestDeviceMetric } from '$lib/server/repositories/metrics.repository';
import { getActiveClientCountBySite } from '$lib/server/repositories/clients.repository';
import {
	schedulerEvents
} from '$lib/server/services/scheduler.service';
import type {
	ActionEvent,
	ActionJob,
	ActionJobStep,
	AlertFiredEvent,
	AlertResolvedEvent,
	ClientUpdatedEvent,
	DeviceRemovedEvent,
	DeviceUpdatedEvent,
	DiscoverySnapshotEvent,
	JobSnapshotEvent,
	JobUpdatedEvent,
	MetricUpdatedEvent,
	TopologyUpdatedEvent
} from '$lib/shared/action-events';

type DiscoveryDevice = {
	id: string;
	identity?: string | null;
	macAddress?: string | null;
	platform?: string | null;
	version?: string | null;
	hardware?: string | null;
	interfaceName?: string | null;
	address?: string | null;
};

type DiscoverySnapshotMessage = {
	type: 'snapshot';
	payload: {
		discoveredDevices: DiscoveryDevice[];
	};
};

type DiscoveryNeighborMessage = {
	type: 'discovery.neighbor';
	payload: DiscoveryDevice;
};

type DeviceAdoptedPayload = {
	host: string;
	deviceId: string;
	siteId: string;
	siteName: string;
	identity?: string;
	platform?: string;
	timestamp: string;
};

type DeviceAdoptedMessage = {
	type: 'device.adopted';
	payload: DeviceAdoptedPayload;
};

type DiscoveryWebSocketMessage = DiscoverySnapshotMessage | DiscoveryNeighborMessage | DeviceAdoptedMessage;

const discoveryController = websockets.continuous('/ws/discovery', { useConnectionKeys: false });
const actionController = websockets.continuous('/ws/controller', {
	useConnectionKeys: false,
	requiredParams: ['siteId']
});

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

async function buildDiscoverySnapshot(): Promise<DiscoveryDevice[]> {
	const allDevices = await listDevices();
	const adoptedHosts = new Set(allDevices.map((device) => device.host));

	return discoveryService.list()
		.filter((device) => device.address && !adoptedHosts.has(device.address))
		.map((device) => ({
			id: device.id,
			identity: device.identity,
			macAddress: device.macAddress,
			platform: device.platform,
			version: device.version,
			hardware: device.hardware,
			interfaceName: device.interfaceName,
			address: device.address
		}));
}

function broadcast(message: DiscoveryWebSocketMessage): void {
	discoveryController.broadcast(JSON.stringify(message), {
		filter: (socket) => socket.readyState === socket.OPEN
	});
}

function broadcastAction(message: ActionEvent): void {
	actionController.broadcast(JSON.stringify(message), {
		filter: (socket) => {
			if (socket.readyState !== socket.OPEN) {
				return false;
			}

			const siteId = socket.params?.siteId;
			if (message.type === 'job.snapshot') {
				return message.payload.siteId === siteId;
			}

			if (message.type === 'job.updated') {
				return !message.payload.siteId || message.payload.siteId === siteId;
			}

			if (
				message.type === 'device.adopted' ||
				message.type === 'device.updated' ||
				message.type === 'device.removed'
			) {
				return message.payload.siteId === siteId;
			}

			if (message.type === 'metric.updated' || message.type === 'client.updated') {
				return !message.payload.siteId || message.payload.siteId === siteId;
			}

			if (message.type === 'alert.fired' || message.type === 'alert.resolved') {
				return message.payload.siteId === siteId;
			}

			if (message.type === 'topology.updated') {
				return message.payload.siteId === siteId;
			}

			return true;
		}
	});
}

async function sendSnapshot(socket: { send(data: string): void }): Promise<void> {
	const snapshot: DiscoverySnapshotMessage = {
		type: 'snapshot',
		payload: {
			discoveredDevices: await buildDiscoverySnapshot()
		}
	};

	socket.send(JSON.stringify(snapshot));
}

async function sendActionSnapshot(socket: { send(data: string): void; params?: Record<string, string> }): Promise<void> {
	const siteId = socket.params?.siteId;
	if (!siteId) {
		return;
	}

	const recentJobs = await listRecentJobsBySite(siteId, 50);
	const hydratedJobs = await Promise.all(recentJobs.map((job) => getJobWithSteps(job.id)));
	const jobSnapshot: JobSnapshotEvent = {
		type: 'job.snapshot',
		payload: {
			siteId,
			jobs: hydratedJobs
				.filter((job): job is NonNullable<Awaited<ReturnType<typeof getJobWithSteps>>> => Boolean(job))
				.map(serializeJob)
		}
	};

	const discoverySnapshot: DiscoverySnapshotEvent = {
		type: 'discovery.snapshot',
		payload: {
			discoveredDevices: await buildDiscoverySnapshot()
		}
	};

	socket.send(JSON.stringify(jobSnapshot));
	socket.send(JSON.stringify(discoverySnapshot));
}

async function handleNeighbor(device: DiscoveryDevice): Promise<void> {
	const allDevices = await listDevices();
	const adoptedHosts = new Set(allDevices.map((item) => item.host));

	if (device.address && adoptedHosts.has(device.address)) {
		return;
	}

	const message: DiscoveryNeighborMessage = {
		type: 'discovery.neighbor',
		payload: device
	};

	broadcast(message);
	broadcastAction({
		type: 'discovery.neighbor',
		payload: device
	});
}

function handleDeviceAdopted(payload: DeviceAdoptedPayload): void {
	const message: DeviceAdoptedMessage = {
		type: 'device.adopted',
		payload
	};

	broadcast(message);
	broadcastAction({
		type: 'device.adopted',
		payload
	});
}

function handleDeviceUpdated(payload: DeviceUpdatedEvent['payload']): void {
	broadcastAction({
		type: 'device.updated',
		payload
	});
}

function handleDeviceRemoved(payload: DeviceRemovedEvent['payload']): void {
	broadcastAction({
		type: 'device.removed',
		payload
	});
}

async function handleMetricUpdated(detail: {
	deviceId: string;
	siteId: string | null;
	collectedAt: Date;
}): Promise<void> {
	const metric = await getLatestDeviceMetric(detail.deviceId);
	if (!metric) return;

	const event: MetricUpdatedEvent = {
		type: 'metric.updated',
		payload: {
			deviceId: detail.deviceId,
			siteId: detail.siteId,
			cpuPercent: metric.cpuPercent,
			freeMemoryBytes: metric.freeMemoryBytes,
			totalMemoryBytes: metric.totalMemoryBytes,
			temperatureCelsius: metric.temperatureCelsius,
			uptimeSeconds: metric.uptimeSeconds,
			collectedAt: detail.collectedAt.toISOString()
		}
	};

	broadcastAction(event);
}

async function handleClientUpdated(detail: { siteId: string | null }): Promise<void> {
	if (!detail.siteId) return;

	const activeCount = await getActiveClientCountBySite(detail.siteId);
	const event: ClientUpdatedEvent = {
		type: 'client.updated',
		payload: {
			siteId: detail.siteId,
			activeCount
		}
	};

	broadcastAction(event);
}

async function handleSchedulerEvent(detail: { jobId: string }): Promise<void> {
	const job = await getJobWithSteps(detail.jobId);
	if (!job) {
		return;
	}

	const message: JobUpdatedEvent = {
		type: 'job.updated',
		payload: {
			siteId: job.siteId,
			job: serializeJob(job)
		}
	};

	broadcastAction(message);
}

discoveryController.on('connect', (socket) => {
	void sendSnapshot(socket).catch(() => {
		/* ignore send failures */
	});
});

actionController.on('connect', (socket) => {
	void sendActionSnapshot(socket).catch(() => {
		/* ignore send failures */
	});
});

discoveryService.on('neighbor', (neighbor) => {
	void handleNeighbor(neighbor).catch(() => {
		/* ignore discovery broadcast failures */
	});
});
adoptionEvents.on('device.adopted', handleDeviceAdopted);
deviceEvents.on('device.updated', handleDeviceUpdated);
deviceEvents.on('device.removed', handleDeviceRemoved);

monitoringEvents.on('metric:updated', (detail) => {
	void handleMetricUpdated(detail).catch(() => {
		/* ignore broadcast failures */
	});
});

monitoringEvents.on('client:updated', (detail) => {
	void handleClientUpdated(detail).catch(() => {
		/* ignore broadcast failures */
	});
});

alertEvaluatorEvents.on('alert:fired', (detail) => {
	const event: AlertFiredEvent = {
		type: 'alert.fired',
		payload: {
			eventId: detail.eventId,
			ruleId: detail.ruleId,
			siteId: detail.siteId,
			deviceId: detail.deviceId,
			severity: detail.severity,
			message: detail.message
		}
	};
	broadcastAction(event);
});

monitoringEvents.on('topology:updated', (detail) => {
	if (!detail.siteId) return;
	const event: TopologyUpdatedEvent = {
		type: 'topology.updated',
		payload: { siteId: detail.siteId }
	};
	broadcastAction(event);
});

alertEvaluatorEvents.on('alert:resolved', (detail) => {
	const event: AlertResolvedEvent = {
		type: 'alert.resolved',
		payload: {
			eventId: detail.eventId,
			ruleId: detail.ruleId,
			siteId: detail.siteId,
			deviceId: detail.deviceId
		}
	};
	broadcastAction(event);
});

for (const eventName of [
	'job:queued',
	'job:started',
	'job:succeeded',
	'job:failed',
	'job:rolling_back',
	'job:reverted',
	'job:revert_failed',
	'step:started',
	'step:succeeded',
	'step:failed',
	'step:reverting',
	'step:reverted',
	'step:revert_failed',
	'step:revert_skipped'
] as const) {
	schedulerEvents.on(eventName, (detail) => {
		void handleSchedulerEvent(detail).catch(() => {
			/* ignore scheduler broadcast failures */
		});
	});
}

export {
	actionController as actionWebsocketController,
	discoveryController as discoveryWebsocketController
};
