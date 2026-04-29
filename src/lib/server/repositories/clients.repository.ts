import { and, count, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { deviceClients } from '$lib/server/db/schema';

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

export async function upsertDeviceClients(clients: DeviceClientInput[]): Promise<void> {
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
}

export async function markDeviceClientsInactive(deviceId: string): Promise<void> {
	await db
		.update(deviceClients)
		.set({ active: false, updatedAt: new Date() })
		.where(eq(deviceClients.deviceId, deviceId));
}

export async function getActiveSiteClients(siteId: string) {
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
}

export async function getActiveClientCountBySite(siteId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(deviceClients)
		.where(and(eq(deviceClients.siteId, siteId), eq(deviceClients.active, true)));
	return row?.value ?? 0;
}
