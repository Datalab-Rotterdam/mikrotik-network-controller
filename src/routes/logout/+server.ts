import { redirect } from '@sveltejs/kit';
import { logout } from '$lib/server/services/auth.service';

export async function POST({ cookies }) {
	await logout(cookies);

	throw redirect(303, '/login');
}
