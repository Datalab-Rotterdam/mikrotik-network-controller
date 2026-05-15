import { enhance } from '@sourceregistry/sveltekit-enhance';
import { DashboardRepository } from '$lib/server/repositories/dashboard.repository';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { JobRepository } from '$lib/server/repositories/job.repository';
import { SessionContext } from '$lib/server/context/session.context';

export const load = enhance.load(
	async ({ params }) => {
		const [summary, siteDevices, recentJobs] = await Promise.all([
			DashboardRepository.getSummary(params.site_id),
			DeviceRepository.list(params.site_id),
			JobRepository.listRecentBySite(params.site_id, 6)
		]);

		return { summary, siteDevices, recentJobs };
	},
	SessionContext.ensure
);
