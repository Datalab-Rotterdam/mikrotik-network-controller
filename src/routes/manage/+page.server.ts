import { redirect } from '@sveltejs/kit';
import { AlertRepository } from '$lib/server/repositories/alerts.repository';
import { ClientRepository } from '$lib/server/repositories/clients.repository';
import { DashboardRepository } from '$lib/server/repositories/dashboard.repository';
import { SiteRepository } from '$lib/server/repositories/site.repository';

export async function load({ locals, url }) {
	if (!locals.user) throw redirect(303, `/manage/account/login?redirectTo=${url.pathname}`);

	const q = url.searchParams.get('q')?.trim() ?? '';

	const [allSites, deviceMap, clientMap, alertMap] = await Promise.all([
		SiteRepository.list(),
		DashboardRepository.getDeviceAggregates(),
		DashboardRepository.getClientAggregates(),
		AlertRepository.getOpenAlertCountsBySite()
	]);

	const siteRows = allSites.map((s) => {
		const dev = deviceMap.get(s.id);
		const total = dev?.total ?? 0;
		const online = dev?.online ?? 0;
		return {
			id: s.id,
			name: s.name,
			location: s.location,
			deviceTotal: total,
			deviceOnline: online,
			deviceOffline: total - online,
			activeClients: clientMap.get(s.id) ?? 0,
			openAlerts: alertMap.get(s.id) ?? 0
		};
	});

	let clientResults: {
		id: string;
		macAddress: string;
		ipAddress: string | null;
		hostname: string | null;
		siteId: string | null;
		siteName: string | null;
		deviceId: string;
		deviceName: string | null;
		interfaceName: string | null;
		isWireless: boolean;
		lastSeenAt: Date;
	}[] = [];

	if (q.length >= 2) {
		clientResults = await ClientRepository.searchClients(q);
	}

	return { sites: siteRows, q, clientResults };
}