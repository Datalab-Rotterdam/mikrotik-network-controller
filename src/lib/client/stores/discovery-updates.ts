import { get, writable, type Writable } from 'svelte/store';

export type DiscoveryDevice = {
	id: string;
	identity?: string | null;
	macAddress?: string | null;
	platform?: string | null;
	version?: string | null;
	hardware?: string | null;
	interfaceName?: string | null;
	address?: string | null;
	uptimeSeconds?: number;
};

export type DeviceAdoptedPayload = {
	host: string;
	deviceId: string;
	siteId: string;
	siteName: string;
	identity?: string;
	platform?: string;
	timestamp: string;
};

export type SnapshotMessage = {
	type: 'snapshot';
	payload: {
		discoveredDevices: DiscoveryDevice[];
	};
};

export type NeighborMessage = {
	type: 'neighbor' | 'discovery.neighbor';
	payload: DiscoveryDevice;
};

export type AdoptedMessage = {
	type: 'adopted' | 'device.adopted';
	payload: DeviceAdoptedPayload;
};

export type DiscoveryWebSocketMessage = SnapshotMessage | NeighborMessage | AdoptedMessage;

export const discoverySocketEvent = writable<DiscoveryWebSocketMessage | null>(null);
export const discoveredDevices: Writable<DiscoveryDevice[]> = writable([]);

export function setDiscoveredDevices(devices: DiscoveryDevice[]): void {
	discoveredDevices.set(
		devices.filter((device) => device.address).map((device) => ({ ...device }))
	);
}

export function processDiscoveryWebSocketMessage(message: unknown): void {
	if (!message || typeof message !== 'object' || !('type' in message)) {
		return;
	}

	const event = message as DiscoveryWebSocketMessage;
	const payload = event.payload;

	discoverySocketEvent.set(event);

	switch (event.type) {
		case 'snapshot':
			if ('discoveredDevices' in payload) {
				setDiscoveredDevices(payload.discoveredDevices);
			}
			return;
		case 'neighbor':
		case 'discovery.neighbor':
			discoveredDevices.update((devices) => {
				const updatedDevices = devices.filter(
					(device) => device.id !== event.payload.id && device.address !== event.payload.address
				);
				return [...updatedDevices, { ...event.payload }];
			});
			return;
		case 'adopted':
		case 'device.adopted':
			discoveredDevices.update((devices) =>
				devices.filter(
					(device) =>
						device.address !== event.payload.host && device.id !== event.payload.deviceId
				)
			);
			return;
		default:
			return;
	}
}

export function processDeviceAdopted(payload: DeviceAdoptedPayload): void {
	discoveredDevices.update((devices) =>
		devices.filter((device) => device.address !== payload.host && device.id !== payload.deviceId)
	);
}

export function processDiscoveryNeighbor(device: DiscoveryDevice): void {
	discoveredDevices.update((devices) => {
		const filtered = devices.filter(
			(d) => d.id !== device.id && d.address !== device.address
		);
		return [...filtered, device];
	});
}

export function initializeDiscoveryDeviceSnapshot(devices: DiscoveryDevice[]) {
	if (get(discoveredDevices).length === 0) {
		setDiscoveredDevices(devices);
	}
}
