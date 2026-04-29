import { getDashboardSummary } from '$lib/server/repositories/dashboard.repository';
import { listDevices } from '$lib/server/repositories/device.repository';

export async function load({ params }) {
	const [summary, siteDevices] = await Promise.all([
		getDashboardSummary(params.site_id),
		listDevices(params.site_id)
	]);

	return { summary, siteDevices };
}
