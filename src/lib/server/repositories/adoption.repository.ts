import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { adoptionAttempts } from '$lib/server/db/schema';

export type AdoptionAttemptRecord = typeof adoptionAttempts.$inferSelect;

export async function listRecentAdoptionAttempts(): Promise<AdoptionAttemptRecord[]> {
	return db.select().from(adoptionAttempts).orderBy(desc(adoptionAttempts.createdAt)).limit(12);
}

export async function createAdoptionAttempt(
	input: typeof adoptionAttempts.$inferInsert
): Promise<AdoptionAttemptRecord> {
	const [attempt] = await db.insert(adoptionAttempts).values(input).returning();

	return attempt;
}

export async function updateAdoptionAttempt(
	id: string,
	patch: Partial<typeof adoptionAttempts.$inferInsert>
): Promise<AdoptionAttemptRecord> {
	const [attempt] = await db
		.update(adoptionAttempts)
		.set({
			...patch,
			updatedAt: new Date()
		})
		.where(eq(adoptionAttempts.id, id))
		.returning();

	return attempt;
}
