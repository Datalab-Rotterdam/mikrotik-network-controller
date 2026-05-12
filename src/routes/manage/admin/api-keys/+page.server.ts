import { fail, type Actions } from '@sveltejs/kit';
import { ApiKeyRepository } from '$lib/server/repositories/api-keys.repository';
import { UserRepository } from '$lib/server/repositories/user.repository';

export async function load() {
	const rows = await ApiKeyRepository.listWithUsers();

	const allUsers = await UserRepository.list();

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
			const { row, raw } = await ApiKeyRepository.create({ userId, name, expiresAt });
			return { success: true, createdId: row.id, createdRaw: raw, createdName: name };
		} catch (e: unknown) {
			return fail(500, { error: e instanceof Error ? e.message : String(e) });
		}
	},

	revoke: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id' });
		await ApiKeyRepository.delete(id);
		return { success: true };
	}
};
