import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { deviceMetrics, interfaceMetrics } from '$lib/server/db/schema';

export type DeviceMetricInsert = typeof deviceMetrics.$inferInsert;
export type InterfaceMetricInsert = typeof interfaceMetrics.$inferInsert;

export async function insertDeviceMetric(
	input: Omit<DeviceMetricInsert, 'id' | 'collectedAt'>
): Promise<void> {
	await db.insert(deviceMetrics).values(input);
}

export async function insertInterfaceMetrics(
	rows: Array<Omit<InterfaceMetricInsert, 'id' | 'collectedAt'>>
): Promise<void> {
	if (rows.length === 0) return;
	await db.insert(interfaceMetrics).values(rows);
}

export async function getLatestDeviceMetric(deviceId: string) {
	const [row] = await db
		.select()
		.from(deviceMetrics)
		.where(eq(deviceMetrics.deviceId, deviceId))
		.orderBy(desc(deviceMetrics.collectedAt))
		.limit(1);
	return row ?? null;
}

export async function getLatestMetricsForSite(siteId: string) {
	const rows = await db.execute(sql`
		SELECT DISTINCT ON (dm.device_id)
			dm.id,
			dm.device_id AS "deviceId",
			dm.collected_at AS "collectedAt",
			dm.cpu_percent AS "cpuPercent",
			dm.free_memory_bytes AS "freeMemoryBytes",
			dm.total_memory_bytes AS "totalMemoryBytes",
			dm.temperature_celsius AS "temperatureCelsius",
			dm.uptime_seconds AS "uptimeSeconds"
		FROM device_metrics dm
		INNER JOIN devices d ON d.id = dm.device_id
		WHERE d.site_id = ${siteId}
		ORDER BY dm.device_id, dm.collected_at DESC
	`);
	return rows as unknown as Array<{
		id: string;
		deviceId: string;
		collectedAt: Date;
		cpuPercent: number | null;
		freeMemoryBytes: number | null;
		totalMemoryBytes: number | null;
		temperatureCelsius: number | null;
		uptimeSeconds: number | null;
	}>;
}

export async function getDeviceMetricsHistory(deviceId: string, sinceMs: number) {
	const since = new Date(Date.now() - sinceMs);
	return db
		.select()
		.from(deviceMetrics)
		.where(and(eq(deviceMetrics.deviceId, deviceId), gte(deviceMetrics.collectedAt, since)))
		.orderBy(deviceMetrics.collectedAt);
}

export async function getInterfaceMetricsHistory(deviceId: string, sinceMs: number) {
	const since = new Date(Date.now() - sinceMs);
	return db
		.select()
		.from(interfaceMetrics)
		.where(and(eq(interfaceMetrics.deviceId, deviceId), gte(interfaceMetrics.collectedAt, since)))
		.orderBy(interfaceMetrics.collectedAt);
}

export async function pruneOldMetrics(olderThanDays = 30): Promise<void> {
	const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
	await Promise.all([
		db.delete(deviceMetrics).where(lt(deviceMetrics.collectedAt, cutoff)),
		db.delete(interfaceMetrics).where(lt(interfaceMetrics.collectedAt, cutoff))
	]);
}
