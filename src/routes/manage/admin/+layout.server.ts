import { error } from '@sveltejs/kit';
import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SiteRepository } from '$lib/server/repositories/site.repository';
import { SessionContext } from '$lib/server/context/session.context';

export const load = enhance.load(
	async ({ locals }) => {
		if (!locals.user?.roles.includes('admin')) {
			throw error(403, 'Admin access required');
		}
		const sites = await SiteRepository.list();
		return { sites };
	},
	SessionContext.ensure
);
