import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { deviceCredentials, deviceInterfaces, devices } from '$lib/server/db/schema';

export async function listDevices() {
	return db
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
		.from(devices)
		.orderBy(asc(devices.name));
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

export async function listDeviceInterfaces() {
	return db
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
		.orderBy(asc(deviceInterfaces.name));
}
