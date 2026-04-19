import { error, redirect } from '@sveltejs/kit';
import { ensureSiteByName } from '$lib/server/repositories/site.repository';

export async function POST({ request }) {
	const formData = await request.formData();
	const name = String(formData.get('name') ?? '').trim();

	if (!name) {
		throw error(400, 'Site name is required.');
	}

	const site = await ensureSiteByName(name);

	throw redirect(303, `/manage/${site.id}`);
}
