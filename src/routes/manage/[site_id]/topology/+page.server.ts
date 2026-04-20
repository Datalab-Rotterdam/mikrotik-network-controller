import { loadSiteDeviceState } from '$lib/server/services/site-device.service';

export async function load({ parent }) {
	const { site } = await parent();
	const { devices, interfaces, discoveredDevices, deviceImages } = await loadSiteDeviceState(site.id);

	return {
		site,
		devices,
		interfaces,
		discoveredDevices,
		deviceImages
	};
}
