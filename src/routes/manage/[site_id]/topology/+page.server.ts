import { loadSiteDeviceState } from '$lib/server/services/site-device.service';
import { getTopologyForSite } from '$lib/server/repositories/topology.repository';

export async function load({ parent, depends }) {
	const { site } = await parent();
	depends(`app:topology:${site.id}`);

	const [{ devices, interfaces, discoveredDevices, deviceImages }, topologyLinks] =
		await Promise.all([loadSiteDeviceState(site.id), getTopologyForSite(site.id)]);

	return {
		site,
		devices,
		interfaces,
		discoveredDevices,
		deviceImages,
		topologyLinks
	};
}
