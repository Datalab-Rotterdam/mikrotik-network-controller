import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { devices, deviceCredentials } from '$lib/server/db/schema';

export type DeviceState = 'pending' | 'approved' | 'managed' | 'error';

export interface DeviceRecord {
	id: string;
	siteId: string | null;
	name: string;
	platform: 'routeros' | 'switchos';
	adoptionMode: 'read_only' | 'managed';
	adoptionState: string;
	connectionStatus: string;
	host: string;
	apiPort: number;
	sshPort: number;
	identity: string | null;
	model: string | null;
	serialNumber: string | null;
	routerOsVersion: string | null;
	architecture: string | null;
	uptimeSeconds: number | null;
	capabilities: string[];
	tags: string[];
	lastSeenAt: string | null;
	lastSyncAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface EnrollInput {
	serial: string;
	model: string;
	identity: string;
	version?: string | null;
	token?: string | null;
}

export interface AckInput {
	serial: string;
	restUser: string;
	restPassword: string;
	managedUser: string;
}

export async function listDevices(siteId?: string) {
	const query = db
		.select({
			id: devices.id,
			siteId: devices.siteId,
			name: devices.name,
			platform: devices.platform,
			adoptionMode: devices.adoptionMode,
			adoptionState: devices.adoptionState,
			connectionStatus: devices.connectionStatus,
			host: devices.host,
			apiPort: devices.apiPort,
			sshPort: devices.sshPort,
			identity: devices.identity,
			model: devices.model,
			serialNumber: devices.serialNumber,
			routerOsVersion: devices.routerOsVersion,
			architecture: devices.architecture,
			uptimeSeconds: devices.uptimeSeconds,
			capabilities: devices.capabilities,
			tags: devices.tags,
			lastSeenAt: devices.lastSeenAt,
			lastSyncAt: devices.lastSyncAt,
			createdAt: devices.createdAt,
			updatedAt: devices.updatedAt
		})
		.from(devices);

	if (siteId) {
		query.where(eq(devices.siteId, siteId));
	}

	return query.orderBy(asc(devices.name));
}

export async function getDeviceById(id: string): Promise<DeviceRecord | undefined> {
	const result = await db
		.select({
			id: devices.id,
			siteId: devices.siteId,
			name: devices.name,
			platform: devices.platform,
			adoptionMode: devices.adoptionMode,
			adoptionState: devices.adoptionState,
			connectionStatus: devices.connectionStatus,
			host: devices.host,
			apiPort: devices.apiPort,
			sshPort: devices.sshPort,
			identity: devices.identity,
			model: devices.model,
			serialNumber: devices.serialNumber,
			routerOsVersion: devices.routerOsVersion,
			architecture: devices.architecture,
			uptimeSeconds: devices.uptimeSeconds,
			capabilities: devices.capabilities,
			tags: devices.tags,
			lastSeenAt: devices.lastSeenAt,
			lastSyncAt: devices.lastSyncAt,
			createdAt: devices.createdAt,
			updatedAt: devices.updatedAt
		})
		.from(devices)
		.where(eq(devices.id, id));

	const device = result[0];
	if (!device) return undefined;

	return {
		...device,
		lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
		lastSyncAt: device.lastSyncAt?.toISOString() ?? null,
		createdAt: device.createdAt.toISOString(),
		updatedAt: device.updatedAt.toISOString()
	};
}

export async function getDeviceByHost(host: string): Promise<DeviceRecord | undefined> {
	const result = await db
		.select({
			id: devices.id,
			siteId: devices.siteId,
			name: devices.name,
			platform: devices.platform,
			adoptionMode: devices.adoptionMode,
			adoptionState: devices.adoptionState,
			connectionStatus: devices.connectionStatus,
			host: devices.host,
			apiPort: devices.apiPort,
			sshPort: devices.sshPort,
			identity: devices.identity,
			model: devices.model,
			serialNumber: devices.serialNumber,
			routerOsVersion: devices.routerOsVersion,
			architecture: devices.architecture,
			uptimeSeconds: devices.uptimeSeconds,
			capabilities: devices.capabilities,
			tags: devices.tags,
			lastSeenAt: devices.lastSeenAt,
			lastSyncAt: devices.lastSyncAt,
			createdAt: devices.createdAt,
			updatedAt: devices.updatedAt
		})
		.from(devices)
		.where(eq(devices.host, host));

	const device = result[0];
	if (!device) return undefined;

	return {
		...device,
		lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
		lastSyncAt: device.lastSyncAt?.toISOString() ?? null,
		createdAt: device.createdAt.toISOString(),
		updatedAt: device.updatedAt.toISOString()
	};
}

export async function getDeviceCredentials(deviceId: string) {
	const result = await db
		.select({
			id: deviceCredentials.id,
			deviceId: deviceCredentials.deviceId,
			purpose: deviceCredentials.purpose,
			username: deviceCredentials.username,
			secretEncrypted: deviceCredentials.secretEncrypted,
			isActive: deviceCredentials.isActive,
			lastValidatedAt: deviceCredentials.lastValidatedAt,
			createdAt: deviceCredentials.createdAt,
			updatedAt: deviceCredentials.updatedAt
		})
		.from(deviceCredentials)
		.where(eq(deviceCredentials.deviceId, deviceId));

	return result.filter((c) => c.isActive);
}

export async function updateDeviceLastSeen(id: string): Promise<void> {
	await db
		.update(devices)
		.set({ lastSeenAt: new Date(), updatedAt: new Date() })
		.where(eq(devices.id, id));
}
