import { redirect } from '@sveltejs/kit';
import { Service } from '@sourceregistry/sveltekit-service-manager/server';
import '$lib/server/services/auth.service';

export async function POST({ cookies }) {
	await Service('auth').logout(cookies);

	throw redirect(303, '/manage/account/login');
}
