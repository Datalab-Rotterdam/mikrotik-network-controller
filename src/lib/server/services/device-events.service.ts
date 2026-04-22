import { EventEmitter } from 'node:events';
import { getDeviceById } from '$lib/server/repositories/telemetry.repository';
import type {
	ActionDeviceRemovedPayload,
	ActionDeviceUpdatedPayload,
	DeviceUpdateReason
} from '$lib/shared/action-events';

export const deviceEvents = new EventEmitter();

export async function emitDeviceUpdated(deviceId: string, reason: DeviceUpdateReason): Promise<void> {
	const device = await getDeviceById(deviceId);
	if (!device) {
		return;
	}

	const payload: ActionDeviceUpdatedPayload = {
		siteId: device.siteId,
		deviceId,
		reason,
		timestamp: new Date().toISOString()
	};

	deviceEvents.emit('device.updated', payload);
}

export function emitDeviceRemoved(input: {
	siteId: string | null;
	deviceId: string;
}): void {
	const payload: ActionDeviceRemovedPayload = {
		siteId: input.siteId,
		deviceId: input.deviceId,
		timestamp: new Date().toISOString()
	};

	deviceEvents.emit('device.removed', payload);
}
