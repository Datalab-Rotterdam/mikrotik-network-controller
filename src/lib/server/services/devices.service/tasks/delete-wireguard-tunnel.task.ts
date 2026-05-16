import {
	deleteWireGuardInterface,
	removeIpAddress,
	removeRoute,
	removeWireGuardPeer
} from '../lib/network-config';
import { VpnRepository } from '$lib/server/repositories/vpn.repository';
import type { TaskDefinition } from '$lib/server/services/scheduler.service/types';

export type DeleteWireGuardTunnelPayload = {
	tunnelId: string;
	localDeviceId: string;
	remoteDeviceId: string;
	localInterfaceName: string;
	remoteInterfaceName: string;
	localTunnelAddress: string;
	remoteTunnelAddress: string;
	localNetworkRange: string;
	remoteNetworkRange: string;
	localPublicKey: string;
	remotePublicKey: string;
};

export default function deleteWireGuardTunnelTask(
	payload: DeleteWireGuardTunnelPayload,
	siteId: string | null
): TaskDefinition<DeleteWireGuardTunnelPayload> {
	return {
		name: 'devices.vpn.delete-wireguard-tunnel',
		deviceId: payload.localDeviceId,
		siteId,
		payload,
		// 'continue' — clean up as much as possible even if individual steps fail
		failurePolicy: 'continue',
		steps: [
			{
				name: 'Remove peer from local device',
				async execute({ payload: p }) {
					await removeWireGuardPeer(p.localDeviceId, p.remotePublicKey);
					return { message: 'Peer removed from local device' };
				}
			},
			{
				name: 'Remove peer from remote device',
				async execute({ payload: p }) {
					await removeWireGuardPeer(p.remoteDeviceId, p.localPublicKey);
					return { message: 'Peer removed from remote device' };
				}
			},
			{
				name: 'Remove route on local device',
				async execute({ payload: p }) {
					await removeRoute(p.localDeviceId, p.remoteNetworkRange);
					return { message: 'Route removed from local device' };
				}
			},
			{
				name: 'Remove route on remote device',
				async execute({ payload: p }) {
					await removeRoute(p.remoteDeviceId, p.localNetworkRange);
					return { message: 'Route removed from remote device' };
				}
			},
			{
				name: 'Remove tunnel IP from local device',
				async execute({ payload: p }) {
					await removeIpAddress(p.localDeviceId, p.localTunnelAddress, p.localInterfaceName);
					return { message: 'Tunnel IP removed from local device' };
				}
			},
			{
				name: 'Remove tunnel IP from remote device',
				async execute({ payload: p }) {
					await removeIpAddress(p.remoteDeviceId, p.remoteTunnelAddress, p.remoteInterfaceName);
					return { message: 'Tunnel IP removed from remote device' };
				}
			},
			{
				name: 'Remove WireGuard interface from local device',
				async execute({ payload: p }) {
					await deleteWireGuardInterface(p.localDeviceId, p.localInterfaceName);
					return { message: 'WG interface removed from local device' };
				}
			},
			{
				name: 'Remove WireGuard interface from remote device',
				async execute({ payload: p }) {
					await deleteWireGuardInterface(p.remoteDeviceId, p.remoteInterfaceName);
					return { message: 'WG interface removed from remote device' };
				}
			},
			{
				name: 'Delete tunnel record from database',
				async execute({ payload: p }) {
					await VpnRepository.deleteTunnel(p.tunnelId);
					return { message: 'Tunnel deleted' };
				}
			}
		]
	};
}
