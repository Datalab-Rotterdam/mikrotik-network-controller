import { and, eq, gt } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { userSessions } from '$lib/server/db/schema';

export type SessionRecord = typeof userSessions.$inferSelect;

export async function createUserSession(
	userId: string,
	tokenHash: string,
	expiresAt: Date
): Promise<SessionRecord> {
	const [session] = await db
		.insert(userSessions)
		.values({
			userId,
			tokenHash,
			expiresAt
		})
		.returning();

	return session;
}

export async function findValidSessionByTokenHash(
	tokenHash: string,
	now = new Date()
): Promise<SessionRecord | undefined> {
	const [session] = await db
		.select()
		.from(userSessions)
		.where(and(eq(userSessions.tokenHash, tokenHash), gt(userSessions.expiresAt, now)))
		.limit(1);

	return session;
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
	await db.delete(userSessions).where(eq(userSessions.tokenHash, tokenHash));
}
