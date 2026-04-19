import { listDeviceInterfaces, listDevices } from '$lib/server/repositories/device.repository';
import { resolveDeviceImage } from '$lib/server/services/device-image-catalog.service';
import discoveryService from '$lib/server/services/discovery.service';

export async function load({ parent }) {
	const { site } = await parent();
	const devices = await listDevices();
	const interfaces = await listDeviceInterfaces();
	const adoptedHosts = new Set(devices.map((device) => device.host));
	const discoveredDevices = discoveryService
		.list()
		.filter((device) => device.address && !adoptedHosts.has(device.address))
		.map((device) => ({
			id: device.id,
			identity: device.identity,
			macAddress: device.macAddress,
			platform: device.platform,
			version: device.version,
			hardware: device.hardware,
			interfaceName: device.interfaceName,
			address: device.address
		}));

	return {
		site,
		devices,
		interfaces,
		discoveredDevices,
		deviceImages: Object.fromEntries([
			...devices.map((device) => [
				device.id,
				resolveDeviceImage(device.model ?? device.identity ?? device.name, device.platform)
			]),
			...discoveredDevices.map((device) => [
				device.id,
				resolveDeviceImage(device.hardware ?? device.identity ?? device.platform, device.platform ?? 'router')
			])
		])
	};
}
