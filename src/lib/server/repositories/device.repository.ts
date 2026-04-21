import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { deviceCredentials, deviceInterfaces, devices } from '$lib/server/db/schema';

export async function listDevices(siteId?: string) {
	const query = db
		.select({
			id: devices.id,
			name: devices.name,
			host: devices.host,
			apiPort: devices.apiPort,
			platform: devices.platform,
			adoptionMode: devices.adoptionMode,
			model: devices.model,
			identity: devices.identity,
			serialNumber: devices.serialNumber,
			architecture: devices.architecture,
			uptimeSeconds: devices.uptimeSeconds,
			adoptionState: devices.adoptionState,
			connectionStatus: devices.connectionStatus,
			routerOsVersion: devices.routerOsVersion,
			capabilities: devices.capabilities,
			tags: devices.tags,
			lastSeenAt: devices.lastSeenAt,
			lastSyncAt: devices.lastSyncAt
		})
		.from(devices);

	if (siteId) {
		query.where(eq(devices.siteId, siteId));
	}

	return query.orderBy(asc(devices.name));
}

export async function getDeviceByIdForSite(deviceId: string, siteId: string) {
	const result = await db
		.select({
			id: devices.id,
			siteId: devices.siteId,
			name: devices.name,
			host: devices.host,
			apiPort: devices.apiPort,
			sshPort: devices.sshPort,
			platform: devices.platform,
			adoptionMode: devices.adoptionMode,
			adoptionState: devices.adoptionState,
			connectionStatus: devices.connectionStatus,
			model: devices.model,
			identity: devices.identity,
			serialNumber: devices.serialNumber,
			architecture: devices.architecture,
			uptimeSeconds: devices.uptimeSeconds,
			routerOsVersion: devices.routerOsVersion,
			capabilities: devices.capabilities,
			tags: devices.tags,
			lastSeenAt: devices.lastSeenAt,
			lastSyncAt: devices.lastSyncAt
		})
		.from(devices)
		.where(and(eq(devices.id, deviceId), eq(devices.siteId, siteId)));

	return result[0] ?? null;
}

export async function upsertAdoptedDevice(input: typeof devices.$inferInsert) {
	const [device] = await db
		.insert(devices)
		.values(input)
		.onConflictDoUpdate({
			target: devices.host,
			set: {
				siteId: input.siteId,
				name: input.name,
				platform: input.platform,
				adoptionMode: input.adoptionMode,
				adoptionState: input.adoptionState,
				connectionStatus: input.connectionStatus,
				apiPort: input.apiPort,
				identity: input.identity,
				model: input.model,
				serialNumber: input.serialNumber,
				routerOsVersion: input.routerOsVersion,
				architecture: input.architecture,
				uptimeSeconds: input.uptimeSeconds,
				capabilities: input.capabilities,
				tags: input.tags,
				lastSeenAt: input.lastSeenAt,
				lastSyncAt: input.lastSyncAt,
				updatedAt: new Date()
			}
		})
		.returning();

	return device;
}

export async function replaceDeviceInterfaces(
	deviceId: string,
	interfaces: Array<Omit<typeof deviceInterfaces.$inferInsert, 'deviceId'>>
): Promise<void> {
	await db.delete(deviceInterfaces).where(eq(deviceInterfaces.deviceId, deviceId));

	if (interfaces.length === 0) {
		return;
	}

	await db.insert(deviceInterfaces).values(
		interfaces.map((networkInterface) => ({
			...networkInterface,
			deviceId
		}))
	);
}

export async function deleteDevice(deviceId: string): Promise<void> {
	await db.delete(devices).where(eq(devices.id, deviceId));
}

export async function replaceReadOnlyCredential(input: {
	deviceId: string;
	username: string;
	secretEncrypted: string;
}): Promise<void> {
	await db
		.update(deviceCredentials)
		.set({
			isActive: false,
			updatedAt: new Date()
		})
		.where(eq(deviceCredentials.deviceId, input.deviceId));

	await db.insert(deviceCredentials).values({
		deviceId: input.deviceId,
		purpose: 'read_only',
		username: input.username,
		secretEncrypted: input.secretEncrypted,
		lastValidatedAt: new Date()
	});
}

export async function replaceCredential(input: {
	deviceId: string;
	purpose: typeof deviceCredentials.$inferSelect.purpose;
	username: string;
	secretEncrypted: string;
}): Promise<void> {
	await db
		.update(deviceCredentials)
		.set({
			isActive: false,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(deviceCredentials.deviceId, input.deviceId),
				eq(deviceCredentials.purpose, input.purpose)
			)
		);

	await db.insert(deviceCredentials).values({
		deviceId: input.deviceId,
		purpose: input.purpose,
		username: input.username,
		secretEncrypted: input.secretEncrypted,
		lastValidatedAt: new Date()
	});
}

export async function updateDeviceState(
	deviceId: string,
	patch: Partial<Pick<typeof devices.$inferInsert, 'adoptionMode' | 'adoptionState' | 'connectionStatus'>>
): Promise<void> {
	await db
		.update(devices)
		.set({
			...patch,
			updatedAt: new Date()
		})
		.where(eq(devices.id, deviceId));
}

export async function listDeviceInterfaces(siteId?: string) {
	const query = db
		.select({
			id: deviceInterfaces.id,
			deviceId: deviceInterfaces.deviceId,
			name: deviceInterfaces.name,
			type: deviceInterfaces.type,
			macAddress: deviceInterfaces.macAddress,
			comment: deviceInterfaces.comment,
			running: deviceInterfaces.running,
			disabled: deviceInterfaces.disabled
		})
		.from(deviceInterfaces)
		.leftJoin(devices, eq(deviceInterfaces.deviceId, devices.id));

	if (siteId) {
		query.where(eq(devices.siteId, siteId));
	}

	return query.orderBy(asc(deviceInterfaces.name));
}
