import { listDevices } from '$lib/server/repositories/device.repository';
import { FirewallRepository } from '$lib/server/repositories/firewall.repository';
import { VlanRepository } from '$lib/server/repositories/vlan.repository';

export async function load({ params, parent }) {
	const { site } = await parent();
	const siteId = site.id;

	const [devices, firewallRules, vlans] = await Promise.all([
		listDevices(siteId),
		FirewallRepository.listBySite(siteId),
		VlanRepository.listBySite(siteId)
	]);

	const deviceMap = Object.fromEntries(
		devices.map((d) => [d.id, d.identity ?? d.name])
	);

	return { devices, firewallRules, vlans, deviceMap };
}
