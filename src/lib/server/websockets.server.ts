import { websockets } from '@sourceregistry/sveltekit-websockets/server';
import discoveryService from '$lib/server/services/discovery.service';
import { listDevices } from '$lib/server/repositories/device.repository';
import { adoptionEvents } from '$lib/server/services/adoption.service';
import {
	getJobWithSteps,
	listRecentJobsBySite
} from '$lib/server/repositories/job.repository';
import {
	schedulerEvents
} from '$lib/server/services/scheduler.service';
import type {
	ActionEvent,
	ActionJob,
	ActionJobStep,
	DiscoverySnapshotEvent,
	JobSnapshotEvent,
	JobUpdatedEvent
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

			if (message.type === 'device.adopted') {
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
