import { redirect } from '@sveltejs/kit';
import { SiteRepository } from '$lib/server/repositories/site.repository';

export async function load() {
	const [firstSite] = await SiteRepository.list();
	const site = firstSite ?? (await SiteRepository.ensureByName('Default'));

	throw redirect(303, `/manage/${site.id}`);
}
