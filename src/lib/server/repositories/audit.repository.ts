import { db } from '$lib/server/db/client';
import { auditEvents } from '$lib/server/db/schema';

export async function recordAuditEvent(input: typeof auditEvents.$inferInsert): Promise<void> {
	await db.insert(auditEvents).values(input);
}
