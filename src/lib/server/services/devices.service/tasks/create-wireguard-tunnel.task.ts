import {
	addIpAddress,
	addRoute,
	addWireGuardPeer,
	createWireGuardInterface,
	deleteWireGuardInterface,
	readWireGuardPublicKey,
	removeIpAddress,
	removeRoute,
	removeWireGuardPeer
} from '../lib/network-config';
import { VpnRepository } from '$lib/server/repositories/vpn.repository';
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import type { TaskDefinition } from '$lib/server/services/scheduler.service/types';

export type CreateWireGuardTunnelPayload = {
	tunnelId: string;
	localDeviceId: string;
	remoteDeviceId: string;
	localInterfaceName: string;
	remoteInterfaceName: string;
	localTunnelAddress: string;
	remoteTunnelAddress: string;
	localNetworkRange: string;
	remoteNetworkRange: string;
	listenPort: number;
};

export default function createWireGuardTunnelTask(
	payload: CreateWireGuardTunnelPayload,
	siteId: string | null
): TaskDefinition<CreateWireGuardTunnelPayload> {
	// Shared state passed between steps via closure — valid because tasks run in-process.
	const state = { localPublicKey: '', remotePublicKey: '' };

	return {
		name: 'devices.vpn.create-wireguard-tunnel',
		deviceId: payload.localDeviceId,
		siteId,
		payload,
		failurePolicy: 'rollback',
		steps: [
			{
				name: 'Create WireGuard interface on local device',
				async execute({ payload: p }) {
					await createWireGuardInterface(p.localDeviceId, p.localInterfaceName, p.listenPort);
					state.localPublicKey = await readWireGuardPublicKey(p.localDeviceId, p.localInterfaceName);
					return { message: `Local WG interface "${p.localInterfaceName}" created` };
				},
				async revert({ payload: p }) {
					await deleteWireGuardInterface(p.localDeviceId, p.localInterfaceName).catch(() => {});
				}
			},
			{
				name: 'Create WireGuard interface on remote device',
				async execute({ payload: p }) {
					await createWireGuardInterface(p.remoteDeviceId, p.remoteInterfaceName, p.listenPort);
					state.remotePublicKey = await readWireGuardPublicKey(p.remoteDeviceId, p.remoteInterfaceName);
					return { message: `Remote WG interface "${p.remoteInterfaceName}" created` };
				},
				async revert({ payload: p }) {
					await deleteWireGuardInterface(p.remoteDeviceId, p.remoteInterfaceName).catch(() => {});
				}
			},
			{
				name: 'Add peer on local device (pointing to remote)',
				async execute({ payload: p }) {
					const remoteDevice = await TelemetryRepository.getDeviceById(p.remoteDeviceId);
					if (!remoteDevice) throw new Error('Remote device not found');
					await addWireGuardPeer(p.localDeviceId, {
						interfaceName: p.localInterfaceName,
						publicKey: state.remotePublicKey,
						endpointAddress: remoteDevice.publicIp ?? remoteDevice.host,
						endpointPort: p.listenPort,
						allowedAddresses: p.remoteNetworkRange
					});
					return { message: 'Peer added on local device' };
				},
				async revert({ payload: p }) {
					if (state.remotePublicKey) {
						await removeWireGuardPeer(p.localDeviceId, state.remotePublicKey).catch(() => {});
					}
				}
			},
			{
				name: 'Add peer on remote device (pointing to local)',
				async execute({ payload: p }) {
					const localDevice = await TelemetryRepository.getDeviceById(p.localDeviceId);
					if (!localDevice) throw new Error('Local device not found');
					await addWireGuardPeer(p.remoteDeviceId, {
						interfaceName: p.remoteInterfaceName,
						publicKey: state.localPublicKey,
						endpointAddress: localDevice.publicIp ?? localDevice.host,
						endpointPort: p.listenPort,
						allowedAddresses: p.localNetworkRange
					});
					return { message: 'Peer added on remote device' };
				},
				async revert({ payload: p }) {
					if (state.localPublicKey) {
						await removeWireGuardPeer(p.remoteDeviceId, state.localPublicKey).catch(() => {});
					}
				}
			},
			{
				name: 'Add tunnel IP address on local device',
				async execute({ payload: p }) {
					await addIpAddress(p.localDeviceId, p.localTunnelAddress, p.localInterfaceName);
					return { message: `Tunnel address ${p.localTunnelAddress} set on local device` };
				},
				async revert({ payload: p }) {
					await removeIpAddress(p.localDeviceId, p.localTunnelAddress, p.localInterfaceName).catch(() => {});
				}
			},
			{
				name: 'Add tunnel IP address on remote device',
				async execute({ payload: p }) {
					await addIpAddress(p.remoteDeviceId, p.remoteTunnelAddress, p.remoteInterfaceName);
					return { message: `Tunnel address ${p.remoteTunnelAddress} set on remote device` };
				},
				async revert({ payload: p }) {
					await removeIpAddress(p.remoteDeviceId, p.remoteTunnelAddress, p.remoteInterfaceName).catch(() => {});
				}
			},
			{
				name: 'Add route on local device (to remote site)',
				async execute({ payload: p }) {
					await addRoute(p.localDeviceId, p.remoteNetworkRange, p.localInterfaceName);
					return { message: `Route to ${p.remoteNetworkRange} added on local device` };
				},
				async revert({ payload: p }) {
					await removeRoute(p.localDeviceId, p.remoteNetworkRange).catch(() => {});
				}
			},
			{
				name: 'Add route on remote device (to local site)',
				async execute({ payload: p }) {
					await addRoute(p.remoteDeviceId, p.localNetworkRange, p.remoteInterfaceName);
					return { message: `Route to ${p.localNetworkRange} added on remote device` };
				},
				async revert({ payload: p }) {
					await removeRoute(p.remoteDeviceId, p.localNetworkRange).catch(() => {});
				}
			},
			{
				name: 'Mark tunnel active in database',
				async execute({ payload: p }) {
					await VpnRepository.updateTunnelStatus(p.tunnelId, 'active', {
						localPublicKey: state.localPublicKey,
						remotePublicKey: state.remotePublicKey
					});
					return { message: 'Tunnel marked active' };
				},
				async revert({ payload: p }) {
					await VpnRepository.updateTunnelStatus(p.tunnelId, 'error').catch(() => {});
				}
			}
		]
	};
}
