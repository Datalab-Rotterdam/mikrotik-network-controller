import { error } from '@sveltejs/kit';
import { findSiteById, listSites } from '$lib/server/repositories/site.repository';
import AlertRepository from '$lib/server/repositories/alert.repository';

export async function load({ params }) {
	const [site, sites, unacknowledgedAlerts] = await Promise.all([
		findSiteById(params.site_id),
		listSites(),
		AlertRepository.events({siteId: params.site_id}).unacknowledged()
	]);

	if (!site) {
		throw error(404, 'Site not found');
	}

	return { site, sites, unacknowledgedAlertCount: unacknowledgedAlerts.length };
}
