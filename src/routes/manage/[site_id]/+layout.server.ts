import { error } from '@sveltejs/kit';
import { findSiteById, listSites } from '$lib/server/repositories/site.repository';

export async function load({ params }) {
	const [site, sites] = await Promise.all([findSiteById(params.site_id), listSites()]);

	if (!site) {
		throw error(404, 'Site not found');
	}

	return { site, sites };
}
