import { getActiveSiteClients } from '$lib/server/repositories/clients.repository';
import { listDevices } from '$lib/server/repositories/device.repository';

export async function load({ params }) {
	const [clients, siteDevices] = await Promise.all([
		getActiveSiteClients(params.site_id),
		listDevices(params.site_id)
	]);

	return { clients, siteDevices };
}
