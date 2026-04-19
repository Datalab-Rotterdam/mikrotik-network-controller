import { getDashboardSummary } from '$lib/server/repositories/dashboard.repository';

export async function load() {
	return {
		summary: await getDashboardSummary()
	};
}
