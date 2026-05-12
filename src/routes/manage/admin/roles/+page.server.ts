import { fail, type Actions } from '@sveltejs/kit';
import { UserRepository } from '$lib/server/repositories/user.repository';

const ALL_PERMISSIONS = [
	'devices:read', 'devices:write', 'devices:adopt', 'devices:remove',
	'jobs:read', 'jobs:write',
	'alerts:read', 'alerts:write',
	'config:read', 'config:write',
	'clients:read',
	'topology:read',
	'admin:users', 'admin:roles', 'admin:api-keys'
];

export async function load() {
	const roles = await UserRepository.listRoles();
	return { roles, allPermissions: ALL_PERMISSIONS };
}

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const description = String(data.get('description') ?? '').trim() || undefined;
		const permissions = data.getAll('permissions').map(String);

		if (!name) return fail(400, { error: 'Name required' });

		try {
			await UserRepository.createRole({ name, description, permissions });
			return { success: true };
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			return fail(400, { error: msg.includes('unique') ? 'Role name already exists' : msg });
		}
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const description = String(data.get('description') ?? '').trim() || undefined;
		const permissions = data.getAll('permissions').map(String);

		if (!id || !name) return fail(400, { error: 'Missing fields' });

		await UserRepository.updateRole(id, { name, description, permissions });
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing id' });
		await UserRepository.deleteRole(id);
		return { success: true };
	}
};
