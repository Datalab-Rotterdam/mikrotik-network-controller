import { db } from '$lib/server/db/client';
import { auditEvents } from '$lib/server/db/schema';

export const AuditRepository = {
	async record(input: typeof auditEvents.$inferInsert): Promise<void> {
		await db.insert(auditEvents).values(input);
	}
};
