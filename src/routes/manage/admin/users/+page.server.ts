import { fail, type Actions } from '@sveltejs/kit';
import { UserRepository } from '$lib/server/repositories/user.repository';
import { hashPassword } from '$lib/server/security/password';

export async function load() {
	const [usersWithRoles, roles] = await Promise.all([UserRepository.listWithRoles(), UserRepository.listRoles()]);
	return { users: usersWithRoles, roles };
}

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const displayName = String(data.get('displayName') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const roleIds = data.getAll('roleIds').map(String);

		if (!email || !displayName || !password) {
			return fail(400, { error: 'Email, name, and password are required' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		try {
			const user = await UserRepository.create({
				email,
				displayName,
				passwordHash: hashPassword(password)
			});
			if (roleIds.length > 0) {
				await UserRepository.setRoles(user.id, roleIds);
			}
			return { success: true, message: `${displayName} invited` };
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			return fail(400, { error: msg.includes('unique') ? 'Email already in use' : msg });
		}
	},

	resetPassword: async ({ request }) => {
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const password = String(data.get('password') ?? '');

		if (!userId || !password) return fail(400, { error: 'Missing fields' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters' });

		await UserRepository.update(userId, { passwordHash: hashPassword(password) });
		return { success: true, message: 'Password reset' };
	},

	disable: async ({ request, locals }) => {
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		if (!userId) return fail(400, { error: 'Missing userId' });
		if (userId === locals.user?.id) return fail(400, { error: 'Cannot disable yourself' });
		await UserRepository.update(userId, { disabledAt: new Date() });
		return { success: true };
	},

	enable: async ({ request }) => {
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		if (!userId) return fail(400, { error: 'Missing userId' });
		await UserRepository.update(userId, { disabledAt: null });
		return { success: true };
	},

	setRoles: async ({ request }) => {
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const roleIds = data.getAll('roleIds').map(String);
		if (!userId) return fail(400, { error: 'Missing userId' });
		await UserRepository.setRoles(userId, roleIds);
		return { success: true };
	},

	remove: async ({ request, locals }) => {
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		if (!userId) return fail(400, { error: 'Missing userId' });
		if (userId === locals.user?.id) return fail(400, { error: 'Cannot delete yourself' });
		await UserRepository.delete(userId);
		return { success: true };
	}
};
