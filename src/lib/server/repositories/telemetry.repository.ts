import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { devices, deviceCredentials, deviceInterfaces } from '$lib/server/db/schema';

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

export async function getDeviceById(id: string) {
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

	return result[0];
}

export async function getDeviceByHost(host: string) {
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

	return result[0];
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

export async function getActiveCredential(deviceId: string, purpose: 'read_only' | 'write' | 'backup') {
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

	return result.find((c) => c.purpose === purpose && c.isActive);
}

export async function updateDeviceLastSeen(id: string): Promise<void> {
	await db
		.update(devices)
		.set({ lastSeenAt: new Date(), updatedAt: new Date() })
		.where(eq(devices.id, id));
}

export async function listDeviceInterfaces(deviceId?: string) {
	const query = db
		.select({
			id: deviceInterfaces.id,
			deviceId: deviceInterfaces.deviceId,
			name: deviceInterfaces.name,
			type: deviceInterfaces.type,
			macAddress: deviceInterfaces.macAddress,
			comment: deviceInterfaces.comment,
			running: deviceInterfaces.running,
			disabled: deviceInterfaces.disabled,
			createdAt: deviceInterfaces.createdAt,
			updatedAt: deviceInterfaces.updatedAt
		})
		.from(deviceInterfaces);

	if (deviceId) {
		query.where(eq(deviceInterfaces.deviceId, deviceId));
	}

	return query.orderBy(asc(deviceInterfaces.name));
}
