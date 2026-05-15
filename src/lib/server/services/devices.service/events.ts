import {AnyEventEmitter} from "$lib/server/utilities/AnyEventEmitter";
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import type {
	ActionDeviceAdoptedPayload,
	ActionDeviceRemovedPayload,
	ActionDeviceUpdatedPayload, DeviceUpdateReason
} from '$lib/shared/action-events';

export type DeviceEventMap = {
	'device.removed': [ActionDeviceRemovedPayload]
	'device.updated': [ActionDeviceUpdatedPayload],
	'device.adopted': [ActionDeviceAdoptedPayload]
}

export const deviceEvents = new AnyEventEmitter<DeviceEventMap>();


export async function emitDeviceUpdated(deviceId: string, reason: DeviceUpdateReason): Promise<void> {
	const device = await TelemetryRepository.getDeviceById(deviceId);
	if (!device) {
		return;
	}

	const payload: ActionDeviceUpdatedPayload = {
		siteId: device.siteId,
		deviceId,
		reason,
		connectionStatus: device.connectionStatus,
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
