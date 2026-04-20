import { websockets } from '@sourceregistry/sveltekit-websockets/server';
import discoveryService from '$lib/server/services/discovery.service';
import { listDevices } from '$lib/server/repositories/device.repository';
import { adoptionEvents } from '$lib/server/services/adoption.service';

type DiscoveryDevice = {
	id: string;
	identity?: string | null;
	macAddress?: string | null;
	platform?: string | null;
	version?: string | null;
	hardware?: string | null;
	interfaceName?: string | null;
	address?: string | null;
};

type DiscoverySnapshotMessage = {
	type: 'snapshot';
	payload: {
		discoveredDevices: DiscoveryDevice[];
	};
};

type DiscoveryNeighborMessage = {
	type: 'discovery.neighbor';
	payload: DiscoveryDevice;
};

type DeviceAdoptedPayload = {
	host: string;
	deviceId: string;
	siteId: string;
	siteName: string;
	identity?: string;
	platform?: string;
	timestamp: string;
};

type DeviceAdoptedMessage = {
	type: 'device.adopted';
	payload: DeviceAdoptedPayload;
};

type DiscoveryWebSocketMessage = DiscoverySnapshotMessage | DiscoveryNeighborMessage | DeviceAdoptedMessage;

const controller = websockets.continuous('/ws/discovery');

async function buildDiscoverySnapshot(): Promise<DiscoveryDevice[]> {
	const allDevices = await listDevices();
	const adoptedHosts = new Set(allDevices.map((device) => device.host));

	return discoveryService.list()
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
}

function broadcast(message: DiscoveryWebSocketMessage): void {
	controller.broadcast(JSON.stringify(message), {
		filter: (socket) => socket.readyState === socket.OPEN
	});
}

async function sendSnapshot(socket: { send(data: string): void }): Promise<void> {
	const snapshot: DiscoverySnapshotMessage = {
		type: 'snapshot',
		payload: {
			discoveredDevices: await buildDiscoverySnapshot()
		}
	};

	socket.send(JSON.stringify(snapshot));
}

async function handleNeighbor(device: DiscoveryDevice): Promise<void> {
	const allDevices = await listDevices();
	const adoptedHosts = new Set(allDevices.map((item) => item.host));

	if (device.address && adoptedHosts.has(device.address)) {
		return;
	}

	const message: DiscoveryNeighborMessage = {
		type: 'discovery.neighbor',
		payload: device
	};

	broadcast(message);
}

function handleDeviceAdopted(payload: DeviceAdoptedPayload): void {
	const message: DeviceAdoptedMessage = {
		type: 'device.adopted',
		payload
	};

	broadcast(message);
}

controller.on('connect', (socket) => {
	void sendSnapshot(socket).catch(() => {
		/* ignore send failures */
	});
});

discoveryService.on('neighbor', (neighbor) => {
	void handleNeighbor(neighbor).catch(() => {
		/* ignore discovery broadcast failures */
	});
});
adoptionEvents.on('device.adopted', handleDeviceAdopted);

export { controller as discoveryWebsocketController };
