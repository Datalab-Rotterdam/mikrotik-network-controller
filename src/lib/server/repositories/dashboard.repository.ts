import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { auditEvents, devices, jobs, sites } from '$lib/server/db/schema';
import { getLatestMetricsForSite } from '$lib/server/repositories/metrics.repository';
import { getActiveClientCountBySite } from '$lib/server/repositories/clients.repository';

export async function getDashboardSummary(siteId?: string) {
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
		siteId ? getLatestMetricsForSite(siteId) : Promise.resolve([]),
		siteId ? getActiveClientCountBySite(siteId) : Promise.resolve(0)
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
}
