import { createHash, randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { apiKeys } from '$lib/server/db/schema';

export type ApiKeyRow = typeof apiKeys.$inferSelect;

function hashKey(raw: string): string {
	return createHash('sha256').update(raw).digest('hex');
}

export function generateApiKey(): { raw: string; hash: string } {
	const raw = `mtk_${randomBytes(32).toString('base64url')}`;
	return { raw, hash: hashKey(raw) };
}

export async function createApiKey(input: {
	userId: string;
	name: string;
	expiresAt?: Date | null;
}): Promise<{ row: ApiKeyRow; raw: string }> {
	const { raw, hash } = generateApiKey();
	const [row] = await db
		.insert(apiKeys)
		.values({
			userId: input.userId,
			name: input.name,
			keyHash: hash,
			expiresAt: input.expiresAt ?? null
		})
		.returning();
	return { row, raw };
}

export async function findApiKeyByRaw(raw: string): Promise<ApiKeyRow | null> {
	const hash = hashKey(raw);
	const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash));
	return row ?? null;
}

export async function listApiKeys(userId?: string) {
	const q = db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
	if (userId) return q.where(eq(apiKeys.userId, userId));
	return q;
}

export async function deleteApiKey(id: string) {
	await db.delete(apiKeys).where(eq(apiKeys.id, id));
}

export async function touchApiKey(id: string) {
	await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}
