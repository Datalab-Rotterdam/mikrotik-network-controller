import {BackupRepository} from "$lib/server/repositories/backup.repository";
import {DeviceRepository} from "$lib/server/repositories/device.repository";
import type {ServiceModuleContext} from "$lib/server/services/devices.service/modules";
import discoveryService from "$lib/server/services/discovery.service";
import {RouterOSClient} from '@sourceregistry/mikrotik-client/routeros';
import {TelemetryRepository} from '$lib/server/repositories/telemetry.repository';
import {decryptSecret} from '$lib/server/security/secrets';
import {emitDeviceUpdated} from '$lib/server/services/devices.service/emitter';
import {Action, Service} from "@sourceregistry/sveltekit-service-manager/server";
import {resolveDeviceImage} from '../lib/image-catalog';

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


export type DeviceRow = Awaited<ReturnType<typeof DeviceRepository.list>>[number];
export type DeviceInterfaceRow = Awaited<ReturnType<typeof DeviceRepository.listInterfaces>>[number];

export type SiteDeviceState = {
    devices: DeviceRow[];
    interfaces: DeviceInterfaceRow[];
    deviceInterfaces: Record<string, DeviceInterfaceRow[]>;
    discoveredDevices: DiscoveryDevice[];
    deviceImages: Record<string, { id: string; label: string; src: string }>;
};


type SiteDeviceServiceOptions = {
    discovery?: DiscoveryService;
    listDevicesFn?: (siteId?: string) => Promise<DeviceRow[]>;
    listDeviceInterfacesFn?: (siteId?: string) => Promise<DeviceInterfaceRow[]>;
    resolveDeviceImageFn?: (model: string | undefined, type: string) => { id: string; label: string; src: string };
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


export default (ctx: ServiceModuleContext) => {
    ctx.router.GET("/", async () => {
        return Action.success(200, await module.list());
    });

    ctx.router.GET("/[serial]", async ({params}) => {
        const result = await module.get(params.serial);
        if (!result) {
            return Action.error(404, { message: "Device not found" });
        }
        return Action.success(200, result);
    });

    ctx.router.GET("/[serial]/stats", async ({params}) => {
        return Action.success(200, await module.stats(params.serial));
    });

    const module = {
    async list() {
        return TelemetryRepository.listDevices();
    },

    async get(id: string) {
        const device = await TelemetryRepository.getDeviceById(id);
        if (!device) {
            return null;
        }

        return {
            id: device.id,
            siteId: device.siteId,
            name: device.name,
            platform: device.platform,
            adoptionMode: device.adoptionMode,
            adoptionState: device.adoptionState,
            connectionStatus: device.connectionStatus,
            host: device.host,
            apiPort: device.apiPort,
            sshPort: device.sshPort,
            identity: device.identity,
            model: device.model,
            serialNumber: device.serialNumber,
            routerOsVersion: device.routerOsVersion,
            architecture: device.architecture,
            uptimeSeconds: device.uptimeSeconds,
            capabilities: device.capabilities,
            tags: device.tags,
            lastSeenAt: device.lastSeenAt,
            lastSyncAt: device.lastSyncAt,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt
        };
    },

    async stats(id: string) {
        const device = await TelemetryRepository.getDeviceById(id);
        if (!device) {
            throw new Error(`Device ${id} not found`);
        }

        const credentials = await TelemetryRepository.getCredentials(device.id);
        const restCredential = credentials.find((c: { purpose: string }) => c.purpose === 'read_only');

        if (!restCredential || !restCredential.secretEncrypted) {
            throw new Error(`Device ${id} is not ready for REST telemetry`);
        }

        const client = new RouterOSClient({
            host: device.host,
            port: device.apiPort,
            username: restCredential.username,
            password: decryptSecret(restCredential.secretEncrypted)
        });

        try {
            const [resource, interfaces] = await Promise.all([
                client.system.resource.get(),
                client.interface.list()
            ]);

            await TelemetryRepository.updateLastSeen(device.id);
            await emitDeviceUpdated(device.id, 'telemetry');

            return {
                id: device.id,
                host: device.host,
                resource,
                interfaces
            };
        } finally {
            await client.close();
        }
    },

    async siteState(siteId: string, options: SiteDeviceServiceOptions = {}): Promise<SiteDeviceState> {
        const {
            discovery = Service('discovery'),
            listDevicesFn = DeviceRepository.list,
            listDeviceInterfacesFn = DeviceRepository.listInterfaces,
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
    },
    backups: (deviceId: string) => BackupRepository.listByDevice(deviceId, 20),
    deviceImage: (model: string | undefined, platform: string) => resolveDeviceImage(model, platform)
    };

    return module;
};
