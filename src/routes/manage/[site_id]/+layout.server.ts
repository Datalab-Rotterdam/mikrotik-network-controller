import { error } from '@sveltejs/kit';
import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SiteRepository } from '$lib/server/repositories/site.repository';
import { AlertRepository } from '$lib/server/repositories/alerts.repository';
import { SessionContext } from '$lib/server/context/session.context';

export const load = enhance.load(
	async ({ params }) => {
		const [site, sites, unacknowledgedAlertCount] = await Promise.all([
			SiteRepository.findById(params.site_id),
			SiteRepository.list(),
			AlertRepository.countUnacknowledged(params.site_id)
		]);

		if (!site) {
			throw error(404, 'Site not found');
		}

		return { site, sites, unacknowledgedAlertCount };
	},
	SessionContext.ensure
);
