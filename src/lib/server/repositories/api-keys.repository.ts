import { createHash, randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { apiKeys, users } from '$lib/server/db/schema';

export type ApiKeyRow = typeof apiKeys.$inferSelect;

function hashKey(raw: string): string {
	return createHash('sha256').update(raw).digest('hex');
}

export const ApiKeyRepository = {
	generate(): { raw: string; hash: string } {
		const raw = `mtk_${randomBytes(32).toString('base64url')}`;
		return { raw, hash: hashKey(raw) };
	},

	async create(input: {
		userId: string;
		name: string;
		expiresAt?: Date | null;
	}): Promise<{ row: ApiKeyRow; raw: string }> {
		const { raw, hash } = ApiKeyRepository.generate();
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
	},

	async findByRaw(raw: string): Promise<ApiKeyRow | null> {
		const hash = hashKey(raw);
		const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash));
		return row ?? null;
	},

	async list(userId?: string) {
		const q = db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
		if (userId) return q.where(eq(apiKeys.userId, userId));
		return q;
	},

	async listWithUsers() {
		return db
			.select({
				id: apiKeys.id,
				name: apiKeys.name,
				userId: apiKeys.userId,
				userEmail: users.email,
				userDisplay: users.displayName,
				lastUsedAt: apiKeys.lastUsedAt,
				expiresAt: apiKeys.expiresAt,
				createdAt: apiKeys.createdAt
			})
			.from(apiKeys)
			.leftJoin(users, eq(apiKeys.userId, users.id))
			.orderBy(desc(apiKeys.createdAt));
	},

	async delete(id: string) {
		await db.delete(apiKeys).where(eq(apiKeys.id, id));
	},

	async touch(id: string) {
		await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
	}
};
