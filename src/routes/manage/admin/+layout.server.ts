import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user?.roles.includes('admin')) {
		throw error(403, 'Admin access required');
	}
	return {};
}
