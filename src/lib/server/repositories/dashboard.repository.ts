import { count, desc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { auditEvents, devices, jobs, sites } from '$lib/server/db/schema';

export async function getDashboardSummary() {
	const [[deviceCount], [siteCount], [jobCount], recentAuditEvents] = await Promise.all([
		db.select({ value: count() }).from(devices),
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
			.limit(6)
	]);

	return {
		deviceCount: deviceCount?.value ?? 0,
		siteCount: siteCount?.value ?? 0,
		jobCount: jobCount?.value ?? 0,
		recentAuditEvents
	};
}
