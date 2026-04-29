import { fail, type Actions } from '@sveltejs/kit';
import { createApiKey, deleteApiKey } from '$lib/server/repositories/api-keys.repository';
import { listUsers } from '$lib/server/repositories/user.repository';
import { db } from '$lib/server/db/client';
import { apiKeys, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function load() {
	const rows = await db
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

	const allUsers = await listUsers();

	return { keys: rows, users: allUsers };
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const userId = String(data.get('userId') ?? '').trim() || locals.user!.id;
		const expiresRaw = String(data.get('expiresAt') ?? '').trim();

		if (!name) return fail(400, { error: 'Name required' });

		const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
		if (expiresAt && isNaN(expiresAt.getTime())) return fail(400, { error: 'Invalid expiry date' });

		try {
			const { row, raw } = await createApiKey({ userId, name, expiresAt });
			return { success: true, createdId: row.id, createdRaw: raw, createdName: name };
		} catch (e: unknown) {
			return fail(500, { error: e instanceof Error ? e.message : String(e) });
		}
	},

	revoke: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id' });
		await deleteApiKey(id);
		return { success: true };
	}
};
