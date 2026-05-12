import { enhance } from '@sourceregistry/sveltekit-enhance';
import { DashboardRepository } from '$lib/server/repositories/dashboard.repository';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { SessionContext } from '$lib/server/context/session.context';

export const load = enhance.load(
	async ({ params }) => {
		const [summary, siteDevices] = await Promise.all([
			DashboardRepository.getSummary(params.site_id),
			DeviceRepository.list(params.site_id)
		]);

		return { summary, siteDevices };
	},
	SessionContext.ensure
);
