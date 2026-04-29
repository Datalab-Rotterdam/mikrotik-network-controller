import { error } from '@sveltejs/kit';
import { findSiteById, listSites } from '$lib/server/repositories/site.repository';
import { countUnacknowledgedAlerts } from '$lib/server/repositories/alerts.repository';

export async function load({ params }) {
	const [site, sites, unacknowledgedAlertCount] = await Promise.all([
		findSiteById(params.site_id),
		listSites(),
		countUnacknowledgedAlerts(params.site_id)
	]);

	if (!site) {
		throw error(404, 'Site not found');
	}

	return { site, sites, unacknowledgedAlertCount };
}
