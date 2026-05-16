import { and, asc, count, eq, notInArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { deviceCredentials, deviceInterfaces, devices } from '$lib/server/db/schema';

export type DeviceRow = Awaited<ReturnType<typeof DeviceRepository.list>>[number];

export type DeviceInterfaceRow = Awaited<ReturnType<typeof DeviceRepository.listInterfaces>>[number];


export const DeviceRepository = {
	async countBySite(siteId: string): Promise<number> {
		const [row] = await db
			.select({ value: count() })
			.from(devices)
			.where(eq(devices.siteId, siteId));
		return row?.value ?? 0;
	},

	async list(siteId?: string) {
		const query = db
			.select({
				id: devices.id,
				siteId: devices.siteId,
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
				publicIp: devices.publicIp,
				agentLastCheckinAt: devices.agentLastCheckinAt,
				lastSeenAt: devices.lastSeenAt,
				lastSyncAt: devices.lastSyncAt
			})
			.from(devices);

		if (siteId) {
			query.where(eq(devices.siteId, siteId));
		}

		return query.orderBy(asc(devices.name));
	},

	async getByIdForSite(deviceId: string, siteId: string) {
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
				publicIp: devices.publicIp,
				lastSeenAt: devices.lastSeenAt,
				lastSyncAt: devices.lastSyncAt
			})
			.from(devices)
			.where(and(eq(devices.id, deviceId), eq(devices.siteId, siteId)));

		return result[0] ?? null;
	},

	async upsertAdopted(input: typeof devices.$inferInsert) {
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
	},

	async replaceInterfaces(
		deviceId: string,
		interfaces: Array<Omit<typeof deviceInterfaces.$inferInsert, 'deviceId'>>
	): Promise<void> {
		if (interfaces.length === 0) {
			await db.delete(deviceInterfaces).where(eq(deviceInterfaces.deviceId, deviceId));
			return;
		}

		const rows = interfaces.map((iface) => ({ ...iface, deviceId }));

		await db
			.insert(deviceInterfaces)
			.values(rows)
			.onConflictDoUpdate({
				target: [deviceInterfaces.deviceId, deviceInterfaces.name],
				set: {
					routerosId: sql`excluded.routeros_id`,
					type: sql`excluded.type`,
					macAddress: sql`excluded.mac_address`,
					comment: sql`excluded.comment`,
					running: sql`excluded.running`,
					disabled: sql`excluded.disabled`,
					pvid: sql`excluded.pvid`,
					frameTypes: sql`excluded.frame_types`,
					bridge: sql`excluded.bridge`,
					// Preserve existing linkSpeed when new value is null (monitor call failed)
					linkSpeed: sql`COALESCE(excluded.link_speed, ${deviceInterfaces.linkSpeed})`,
					updatedAt: sql`now()`
				}
			});

		// Remove interfaces that disappeared from the device
		const activeNames = rows.map((r) => r.name);
		await db
			.delete(deviceInterfaces)
			.where(
				and(
					eq(deviceInterfaces.deviceId, deviceId),
					notInArray(deviceInterfaces.name, activeNames)
				)
			);
	},

	async delete(deviceId: string): Promise<void> {
		await db.delete(devices).where(eq(devices.id, deviceId));
	},

	async replaceReadOnlyCredential(input: {
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
	},

	async replaceCredential(input: {
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
	},

	async updateState(
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
	},

	async updateTelemetryState(
		deviceId: string,
		status: 'online' | 'offline' | 'auth_failed',
		uptimeSeconds?: number
	): Promise<void> {
		const now = new Date();
		await db
			.update(devices)
			.set({
				connectionStatus: status,
				...(status === 'online' ? { lastSeenAt: now } : {}),
				...(uptimeSeconds !== undefined ? { uptimeSeconds } : {}),
				updatedAt: now
			})
			.where(eq(devices.id, deviceId));
	},

	async setAgentToken(deviceId: string, agentToken: string): Promise<void> {
		await db
			.update(devices)
			.set({ agentToken, updatedAt: new Date() })
			.where(eq(devices.id, deviceId));
	},

	async getByAgentToken(agentToken: string) {
		const result = await db
			.select()
			.from(devices)
			.where(eq(devices.agentToken, agentToken));
		return result[0] ?? null;
	},

	async recordAgentCheckin(
		deviceId: string,
		agentIp: string,
		agentCfgversion: string | null
	): Promise<void> {
		const existing = await db.select({ host: devices.host }).from(devices).where(eq(devices.id, deviceId));
		const isPlaceholder = existing[0]?.host?.startsWith('pending-') ?? false;
		await db
			.update(devices)
			.set({
				agentIp,
				agentCfgversion,
				agentLastCheckinAt: new Date(),
				updatedAt: new Date(),
				...(isPlaceholder && agentIp !== 'unknown' ? { host: agentIp } : {})
			})
			.where(eq(devices.id, deviceId));
	},

	async setPublicIp(deviceId: string, publicIp: string | null): Promise<void> {
		await db
			.update(devices)
			.set({ publicIp, updatedAt: new Date() })
			.where(eq(devices.id, deviceId));
	},

	async updateName(deviceId: string, name: string): Promise<void> {
		await db
			.update(devices)
			.set({ name, updatedAt: new Date() })
			.where(eq(devices.id, deviceId));
	},

	async updateSite(deviceId: string, siteId: string): Promise<void> {
		await db
			.update(devices)
			.set({ siteId, updatedAt: new Date() })
			.where(eq(devices.id, deviceId));
	},

	async listInterfaces(siteId?: string) {
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
				pvid: deviceInterfaces.pvid,
				frameTypes: deviceInterfaces.frameTypes,
				bridge: deviceInterfaces.bridge,
				linkSpeed: deviceInterfaces.linkSpeed
			})
			.from(deviceInterfaces)
			.leftJoin(devices, eq(deviceInterfaces.deviceId, devices.id));

		if (siteId) {
			query.where(eq(devices.siteId, siteId));
		}

		return query.orderBy(asc(deviceInterfaces.name));
	}
};
