import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { syslogEvents } from '$lib/server/db/schema';

export type SyslogInsert = typeof syslogEvents.$inferInsert;

export const SyslogRepository = {
	async insert(input: Omit<SyslogInsert, 'id' | 'createdAt'>): Promise<typeof syslogEvents.$inferSelect> {
		const [row] = await db.insert(syslogEvents).values(input).returning();
		return row;
	},

	async list(siteId: string, options: { limit?: number; severity?: string; category?: string } = {}) {
		const { limit = 200, severity, category } = options;

		const severityValues = ['emergency','alert','critical','error','warning','notice','info','debug'] as const;
		type SeverityVal = typeof severityValues[number];

		const conditions = [eq(syslogEvents.siteId, siteId)];
		if (severity && severityValues.includes(severity as SeverityVal)) {
			conditions.push(eq(syslogEvents.severity, severity as SeverityVal));
		}
		if (category) conditions.push(eq(syslogEvents.category, category));

		return db
			.select()
			.from(syslogEvents)
			.where(and(...conditions))
			.orderBy(desc(syslogEvents.createdAt))
			.limit(limit);
	}
};
