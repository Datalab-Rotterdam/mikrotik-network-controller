import { listDevices } from '$lib/server/repositories/device.repository';
import discoveryService from '$lib/server/services/discovery.service';

export async function load() {
	return {
		devices: await listDevices(),
		discoveredDevices: discoveryService.list().map((device) => ({
			id: device.id,
			identity: device.identity,
			macAddress: device.macAddress,
			platform: device.platform,
			version: device.version,
			hardware: device.hardware,
			interfaceName: device.interfaceName,
			address: device.address
		}))
	};
}
