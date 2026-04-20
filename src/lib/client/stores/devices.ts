import { get, writable, type Writable } from 'svelte/store';
import type { DeviceInterfaceRow } from '$lib/server/services/site-device.service';
import type { DiscoveryDevice } from './discovery-updates';

export type { DeviceRow } from '$lib/server/services/site-device.service';

export type Device = {
	id: string;
	type: 'router' | 'switch' | string;
	name: string;
	application: string;
	status: string;
	macAddress: string;
	model: string;
	version: string;
	ipAddress: string;
	uplink: string;
	parentDevice: string;
	platform: string;
	adopted: boolean;
	image: { id: string; label: string; src: string };
	interfaces: DeviceInterfaceRow[];
	details: {
		identity: string;
		serialNumber: string;
		architecture: string;
		uptimeSeconds?: number | null;
		lastSeenAt?: string | Date | null;
		lastSyncAt?: string | Date | null;
		capabilities: string[];
		tags: string[];
	};
};

export type DevicesState = {
	devices: Device[];
	interfaces: DeviceInterfaceRow[] | undefined;
	deviceInterfaces: Record<string, DeviceInterfaceRow[]> | undefined;
	discoveredDevices: DiscoveryDevice[];
	deviceImages: Record<string, { id: string; label: string; src: string }>;
	loading: boolean;
	error?: string;
};

const initialState: DevicesState = {
	devices: [],
	interfaces: [],
	deviceInterfaces: {},
	discoveredDevices: [],
	deviceImages: {},
	loading: true
};

export const devicesState: Writable<DevicesState> = writable(initialState);

export function setDevicesState(state: Partial<DevicesState>): void {
	devicesState.update((current) => ({
		...current,
		...state,
		loading: false
	}));
}

export function resetDevicesState(): void {
	devicesState.set(initialState);
}

export function addDevice(device: Device): void {
	devicesState.update((current) => ({
		...current,
		devices: [...current.devices, device]
	}));
}

export function removeDevice(deviceId: string): void {
	devicesState.update((current) => ({
		...current,
		devices: current.devices.filter((d) => d.id !== deviceId)
	}));
}

export function updateDevice(deviceId: string, updates: Partial<Device>): void {
	devicesState.update((current) => ({
		...current,
		devices: current.devices.map((d) =>
			d.id === deviceId ? { ...d, ...updates } as Device : d
		)
	}));
}

export function setDiscoveredDevicesFromPayload(devices: DiscoveryDevice[]): void {
	devicesState.update((current) => ({
		...current,
		discoveredDevices: devices.filter((d) => d.address)
	}));
}

export function processDeviceAdopted(payload: {
	host: string;
	deviceId: string;
	siteId: string;
	siteName: string;
	identity?: string;
	platform?: string;
	timestamp: string;
}): void {
	devicesState.update((current) => ({
		...current,
		discoveredDevices: current.discoveredDevices.filter(
			(d) => d.address !== payload.host && d.id !== payload.deviceId
		)
	}));
}

export function processDiscoveryNeighbor(device: DiscoveryDevice): void {
	devicesState.update((current) => {
		const filtered = current.discoveredDevices.filter(
			(d) => d.id !== device.id && d.address !== device.address
		);
		return {
			...current,
			discoveredDevices: [...filtered, device]
		};
	});
}

export function setLoading(loading: boolean): void {
	devicesState.update((current) => ({
		...current,
		loading
	}));
}

export function setError(error?: string): void {
	devicesState.update((current) => ({
		...current,
		error
	}));
}
