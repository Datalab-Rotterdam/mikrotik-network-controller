import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';
import { loadSiteDeviceState } from '$lib/server/services/devices.service/site-state';
import { TopologyRepository } from '$lib/server/repositories/topology.repository';

export const load = enhance.load(async ({ parent, depends }) => {
	const { site } = await parent();
	depends('app:topology:' + site.id);
	
	const [{ devices, interfaces, discoveredDevices, deviceImages }, topologyLinks] =
		await Promise.all([loadSiteDeviceState(site.id), TopologyRepository.getBySite(site.id)]);

	return {
		site,
		devices,
		interfaces,
		discoveredDevices,
		deviceImages,
		topologyLinks
	};
}, SessionContext.ensure);
