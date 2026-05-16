import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { FirewallRepository } from '$lib/server/repositories/firewall.repository';
import { VlanRepository } from '$lib/server/repositories/vlan.repository';
import { VpnRepository } from '$lib/server/repositories/vpn.repository';
import { SiteRepository } from '$lib/server/repositories/site.repository';
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import { Service } from '@sourceregistry/sveltekit-service-manager/server';
import { fail, type Actions } from '@sveltejs/kit';
import createWireGuardTunnelTask from '$lib/server/services/devices.service/tasks/create-wireguard-tunnel.task';
import deleteWireGuardTunnelTask from '$lib/server/services/devices.service/tasks/delete-wireguard-tunnel.task';

function allocateTunnelCidr(tunnelIndex: number): string {
	const offset = tunnelIndex * 4;
	const third = Math.floor(offset / 256);
	const fourth = offset % 256;
	return `10.255.${third}.${fourth}/30`;
}

export const load = enhance.load(async ({ parent }) => {
	const { site } = await parent();
	const siteId = site.id;

	const [devices, firewallRules, vlans, wgInterfaces, wgPeers, tunnels, allSites, allDevices] =
		await Promise.all([
			DeviceRepository.list(siteId),
			FirewallRepository.listBySite(siteId),
			VlanRepository.listBySite(siteId),
			VpnRepository.listWgInterfacesBySite(siteId),
			VpnRepository.listWgPeersBySite(siteId),
			VpnRepository.listTunnelsBySite(siteId),
			SiteRepository.list(),
			DeviceRepository.list()
		]);

	const deviceMap = Object.fromEntries(devices.map((d) => [d.id, d.identity ?? d.name]));
	const allDeviceMap = Object.fromEntries(allDevices.map((d) => [d.id, d.identity ?? d.name]));
	const siteMap = Object.fromEntries(allSites.map((s) => [s.id, s.name]));

	// Group all-site devices by site for the create-tunnel form
	const devicesBySite = allSites
		.filter((s) => s.id !== siteId)
		.map((s) => ({
			siteId: s.id,
			siteName: s.name,
			devices: allDevices.filter((d) => d.siteId === s.id)
		}))
		.filter((s) => s.devices.length > 0);

	return {
		devices,
		firewallRules,
		vlans,
		wgInterfaces,
		wgPeers,
		tunnels,
		deviceMap,
		allDeviceMap,
		siteMap,
		devicesBySite
	};
}, SessionContext.ensure);

export const actions: Actions = {
	createTunnel: async ({ request, params }) => {
		const data = await request.formData();
		const siteId = params.site_id ?? '';

		const name = String(data.get('name') ?? '').trim();
		const localDeviceId = String(data.get('localDeviceId') ?? '');
		const remoteDeviceId = String(data.get('remoteDeviceId') ?? '');
		const remoteSiteId = String(data.get('remoteSiteId') ?? '');
		const localNetworkRange = String(data.get('localNetworkRange') ?? '').trim();
		const remoteNetworkRange = String(data.get('remoteNetworkRange') ?? '').trim();
		const listenPort = 13231;

		if (!name || !localDeviceId || !remoteDeviceId || !localNetworkRange || !remoteNetworkRange) {
			return fail(400, { tunnelError: 'All fields are required' });
		}

		// Pre-flight: both devices must be online and managed
		const [localDevice, remoteDevice] = await Promise.all([
			TelemetryRepository.getDeviceById(localDeviceId),
			TelemetryRepository.getDeviceById(remoteDeviceId)
		]);
		if (!localDevice) return fail(400, { tunnelError: 'Local device not found' });
		if (!remoteDevice) return fail(400, { tunnelError: 'Remote device not found' });
		if (localDevice.connectionStatus !== 'online')
			return fail(400, { tunnelError: 'Local device is not online' });
		if (remoteDevice.connectionStatus !== 'online')
			return fail(400, { tunnelError: 'Remote device is not online' });
		if (localDevice.adoptionMode !== 'managed')
			return fail(400, { tunnelError: 'Local device must be in managed mode' });
		if (remoteDevice.adoptionMode !== 'managed')
			return fail(400, { tunnelError: 'Remote device must be in managed mode' });
		// publicIp is optional — falls back to host; required only when devices are behind NAT

		// Auto-assign tunnel /30 from 10.255.0.0/16 pool based on existing tunnel count
		const tunnelCount = await VpnRepository.countAll();
		const tunnelCidr = allocateTunnelCidr(tunnelCount);
		const [base, prefix] = tunnelCidr.split('/');
		const parts = base.split('.').map(Number);
		const localTunnelAddress = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3] + 1}/${prefix}`;
		const remoteTunnelAddress = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3] + 2}/${prefix}`;

		// Interface name on each device reflects the peer device name — max 15 chars total (RouterOS limit)
		const slugify = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 11);
		const localInterfaceName = `wg-${slugify(remoteDevice.name)}`;
		const remoteInterfaceName = `wg-${slugify(localDevice.name)}`;

		const tunnel = await VpnRepository.createTunnel({
			name,
			protocol: 'wireguard',
			status: 'provisioning',
			localDeviceId,
			remoteDeviceId,
			localSiteId: siteId,
			remoteSiteId: remoteSiteId || null,
			localInterfaceName,
			remoteInterfaceName,
			localTunnelAddress,
			remoteTunnelAddress,
			localNetworkRange,
			remoteNetworkRange,
			listenPort
		});

		const task = createWireGuardTunnelTask(
			{
				tunnelId: tunnel.id,
				localDeviceId,
				remoteDeviceId,
				localInterfaceName,
				remoteInterfaceName,
				localTunnelAddress,
				remoteTunnelAddress,
				localNetworkRange,
				remoteNetworkRange,
				listenPort
			},
			siteId ?? null
		);

		await Service('scheduler').schedule(task);
		return { tunnelCreated: true, tunnelName: name };
	},

	deleteTunnel: async ({ request }) => {
		const data = await request.formData();
		const tunnelId = String(data.get('tunnelId') ?? '');
		if (!tunnelId) return fail(400, { tunnelError: 'Missing tunnel ID' });

		const tunnel = await VpnRepository.findTunnelById(tunnelId);
		if (!tunnel) return fail(404, { tunnelError: 'Tunnel not found' });
		if (tunnel.status === 'removing') return fail(400, { tunnelError: 'Tunnel already being removed' });

		await VpnRepository.updateTunnelStatus(tunnelId, 'removing');

		const task = deleteWireGuardTunnelTask(
			{
				tunnelId,
				localDeviceId: tunnel.localDeviceId,
				remoteDeviceId: tunnel.remoteDeviceId,
				localInterfaceName: tunnel.localInterfaceName ?? '',
				remoteInterfaceName: tunnel.remoteInterfaceName ?? '',
				localTunnelAddress: tunnel.localTunnelAddress ?? '',
				remoteTunnelAddress: tunnel.remoteTunnelAddress ?? '',
				localNetworkRange: tunnel.localNetworkRange ?? '',
				remoteNetworkRange: tunnel.remoteNetworkRange ?? '',
				localPublicKey: tunnel.localPublicKey ?? '',
				remotePublicKey: tunnel.remotePublicKey ?? ''
			},
			tunnel.localSiteId ?? null
		);

		await Service('scheduler').schedule(task);
		return { tunnelDeleted: true };
	}
};
