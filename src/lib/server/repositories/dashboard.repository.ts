import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { auditEvents, deviceClients, devices, jobs, sites } from '$lib/server/db/schema';
import { MetricsRepository } from '$lib/server/repositories/metrics.repository';
import { ClientRepository } from '$lib/server/repositories/clients.repository';

export const DashboardRepository = {
	async getSummary(siteId?: string) {
		const [
			[deviceCount],
			[onlineCount],
			[siteCount],
			[jobCount],
			recentAuditEvents,
			latestMetrics,
			activeClientCount
		] = await Promise.all([
			siteId
				? db.select({ value: count() }).from(devices).where(eq(devices.siteId, siteId))
				: db.select({ value: count() }).from(devices),
			siteId
				? db
						.select({ value: count() })
						.from(devices)
						.where(and(eq(devices.siteId, siteId), eq(devices.connectionStatus, 'online')))
				: db
						.select({ value: count() })
						.from(devices)
						.where(eq(devices.connectionStatus, 'online')),
			db.select({ value: count() }).from(sites),
			db.select({ value: count() }).from(jobs),
			db
				.select({
					id: auditEvents.id,
					action: auditEvents.action,
					message: auditEvents.message,
					createdAt: auditEvents.createdAt
				})
				.from(auditEvents)
				.orderBy(desc(auditEvents.createdAt))
				.limit(6),
			siteId ? MetricsRepository.getLatestBySite(siteId) : Promise.resolve([]),
			siteId ? ClientRepository.getActiveCountBySite(siteId) : Promise.resolve(0)
		]);

		return {
			deviceCount: deviceCount?.value ?? 0,
			onlineCount: onlineCount?.value ?? 0,
			siteCount: siteCount?.value ?? 0,
			jobCount: jobCount?.value ?? 0,
			activeClientCount,
			recentAuditEvents,
			latestMetrics
		};
	},

	async getDeviceAggregates() {
		const rows = await db
			.select({
				siteId: devices.siteId,
				total: count(),
				online: sql<number>`sum(case when ${devices.connectionStatus} = 'online' then 1 else 0 end)::int`
			})
			.from(devices)
			.where(sql`${devices.siteId} is not null`)
			.groupBy(devices.siteId);

		return new Map(rows.map((r) => [r.siteId, r]));
	},

	async getClientAggregates() {
		const rows = await db
			.select({ siteId: deviceClients.siteId, total: count() })
			.from(deviceClients)
			.where(and(eq(deviceClients.active, true), sql`${deviceClients.siteId} is not null`))
			.groupBy(deviceClients.siteId);

		return new Map(rows.map((r) => [r.siteId, r.total]));
	}
};
