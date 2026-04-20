import { listDeviceInterfaces, listDevices } from '$lib/server/repositories/device.repository';
import discoveryService from '$lib/server/services/discovery.service';
import { resolveDeviceImage } from '$lib/server/services/device-image-catalog.service';

export type DeviceRow = Awaited<ReturnType<typeof listDevices>>[number];
export type DeviceInterfaceRow = Awaited<ReturnType<typeof listDeviceInterfaces>>[number];

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

type DiscoveryService = {
	list: () => Array<DiscoveryDevice>;
};

type SiteDeviceServiceOptions = {
	discovery?: DiscoveryService;
	listDevicesFn?: (siteId?: string) => Promise<DeviceRow[]>;
	listDeviceInterfacesFn?: (siteId?: string) => Promise<DeviceInterfaceRow[]>;
	resolveDeviceImageFn?: (model: string | undefined, type: string) => { id: string; label: string; src: string };
};

export type SiteDeviceState = {
	devices: DeviceRow[];
	interfaces: DeviceInterfaceRow[];
	deviceInterfaces: Record<string, DeviceInterfaceRow[]>;
	discoveredDevices: DiscoveryDevice[];
	deviceImages: Record<string, { id: string; label: string; src: string }>;
};

function groupDeviceInterfaces(interfaces: DeviceInterfaceRow[]) {
	return interfaces.reduce<Record<string, DeviceInterfaceRow[]>>((groups, networkInterface) => {
		groups[networkInterface.deviceId] = [...(groups[networkInterface.deviceId] ?? []), networkInterface];
		return groups;
	}, {});
}

function buildDeviceImages(
	devices: DeviceRow[],
	discoveredDevices: DiscoveryDevice[],
	resolveFn: (model: string | undefined, type: string) => { id: string; label: string; src: string }
) {
	return Object.fromEntries([
		...devices.map((device) => [
			device.id,
			resolveFn(device.model ?? device.identity ?? device.name, device.platform)
		]),
		...discoveredDevices.map((device) => [
			device.id,
			resolveFn(device.hardware ?? device.identity ?? undefined, device.platform ?? 'router')
		])
	]);
}

export async function loadSiteDeviceState(siteId: string, options: SiteDeviceServiceOptions = {}): Promise<SiteDeviceState> {
	const {
		discovery = discoveryService,
		listDevicesFn = listDevices,
		listDeviceInterfacesFn = listDeviceInterfaces,
		resolveDeviceImageFn = resolveDeviceImage
	} = options;

	const allDevices = await listDevicesFn();
	const devices = await listDevicesFn(siteId);
	const interfaces = await listDeviceInterfacesFn(siteId);
	const deviceInterfaces = groupDeviceInterfaces(interfaces);

	const adoptedHosts = new Set(allDevices.map((device) => device.host));
	const discoveredDevices = discovery
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

	const deviceImages = buildDeviceImages(
		devices,
		discoveredDevices,
		typeof resolveDeviceImageFn === 'function'
			? resolveDeviceImageFn
			: resolveDeviceImage
	);

	return {
		devices,
		interfaces,
		deviceInterfaces,
		discoveredDevices,
		deviceImages
	};
}
