import { redirect } from '@sveltejs/kit';
import { ensureSiteByName, listSites } from '$lib/server/repositories/site.repository';

export async function load() {
	const [firstSite] = await listSites();
	const site = firstSite ?? (await ensureSiteByName('Default'));

	throw redirect(303, `/manage/${site.id}`);
}
