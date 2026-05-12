import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { deviceClients, devices, sites } from '$lib/server/db/schema';

export type DeviceClientInput = {
	deviceId: string;
	siteId: string | null;
	macAddress: string;
	ipAddress?: string | null;
	hostname?: string | null;
	interfaceName?: string | null;
	isWireless?: boolean;
	ssid?: string | null;
	signalStrength?: number | null;
};

export const ClientRepository = {
	async upsertForDevice(clients: DeviceClientInput[]): Promise<void> {
		if (clients.length === 0) return;

		const now = new Date();

		await db
			.insert(deviceClients)
			.values(
				clients.map((c) => ({
					deviceId: c.deviceId,
					siteId: c.siteId,
					macAddress: c.macAddress,
					ipAddress: c.ipAddress ?? null,
					hostname: c.hostname ?? null,
					interfaceName: c.interfaceName ?? null,
					isWireless: c.isWireless ?? false,
					ssid: c.ssid ?? null,
					signalStrength: c.signalStrength ?? null,
					firstSeenAt: now,
					lastSeenAt: now,
					active: true
				}))
			)
			.onConflictDoUpdate({
				target: [deviceClients.deviceId, deviceClients.macAddress],
				set: {
					ipAddress: sql`EXCLUDED.ip_address`,
					hostname: sql`EXCLUDED.hostname`,
					interfaceName: sql`EXCLUDED.interface_name`,
					isWireless: sql`EXCLUDED.is_wireless`,
					ssid: sql`EXCLUDED.ssid`,
					signalStrength: sql`EXCLUDED.signal_strength`,
					lastSeenAt: now,
					active: true,
					updatedAt: now
				}
			});
	},

	async markInactiveForDevice(deviceId: string): Promise<void> {
		await db
			.update(deviceClients)
			.set({ active: false, updatedAt: new Date() })
			.where(eq(deviceClients.deviceId, deviceId));
	},

	async getActiveBySite(siteId: string) {
		return db
			.select({
				id: deviceClients.id,
				deviceId: deviceClients.deviceId,
				siteId: deviceClients.siteId,
				macAddress: deviceClients.macAddress,
				ipAddress: deviceClients.ipAddress,
				hostname: deviceClients.hostname,
				interfaceName: deviceClients.interfaceName,
				isWireless: deviceClients.isWireless,
				ssid: deviceClients.ssid,
				signalStrength: deviceClients.signalStrength,
				firstSeenAt: deviceClients.firstSeenAt,
				lastSeenAt: deviceClients.lastSeenAt,
				active: deviceClients.active
			})
			.from(deviceClients)
			.where(and(eq(deviceClients.siteId, siteId), eq(deviceClients.active, true)))
			.orderBy(deviceClients.lastSeenAt);
	},

	async getActiveCountBySite(siteId: string): Promise<number> {
		const [row] = await db
			.select({ value: count() })
			.from(deviceClients)
			.where(and(eq(deviceClients.siteId, siteId), eq(deviceClients.active, true)));
		return row?.value ?? 0;
	},

	async searchClients(query: string, limit = 50) {
		return db
			.select({
				id: deviceClients.id,
				macAddress: deviceClients.macAddress,
				ipAddress: deviceClients.ipAddress,
				hostname: deviceClients.hostname,
				siteId: deviceClients.siteId,
				siteName: sites.name,
				deviceId: deviceClients.deviceId,
				deviceName: devices.name,
				interfaceName: deviceClients.interfaceName,
				isWireless: deviceClients.isWireless,
				lastSeenAt: deviceClients.lastSeenAt
			})
			.from(deviceClients)
			.leftJoin(sites, eq(deviceClients.siteId, sites.id))
			.leftJoin(devices, eq(deviceClients.deviceId, devices.id))
			.where(
				or(
					ilike(deviceClients.macAddress, `%${query}%`),
					ilike(deviceClients.ipAddress, `%${query}%`),
					ilike(deviceClients.hostname, `%${query}%`)
				)
			)
			.orderBy(deviceClients.lastSeenAt)
			.limit(limit);
	}
};
