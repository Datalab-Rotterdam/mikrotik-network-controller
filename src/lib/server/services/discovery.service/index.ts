import {DeviceRepository} from "$lib/server/repositories/device.repository";
import {NeighborDiscoveryService} from "@sourceregistry/mikrotik-client";
import type {DiscoveredNeighbor} from "@sourceregistry/mikrotik-client/discovery";
import {Service, ServiceManager} from '@sourceregistry/sveltekit-service-manager';
import env from "$lib/server/configurations/env.configuration";

export const discovery = new NeighborDiscoveryService({
    host: env.PUBLIC_DISCOVERY_HOST,
    port: env.PUBLIC_DISCOVERY_PORT,
    dedupe: true
});

export type DiscoveryDevice = Omit<DiscoveredNeighbor, 'raw'>

async function buildDiscoverySnapshot(): Promise<DiscoveryDevice[]> {
    const allDevices = await DeviceRepository.list();
    const adoptedHosts = new Set(allDevices.map((device) => device.host));

    return discovery.list()
        .filter((device) => device.address && !adoptedHosts.has(device.address))
        .map((device) => {
            let dev: DiscoveryDevice & { raw?: any } = {...device};
            delete dev.raw;
            return dev as DiscoveryDevice;
        });
}

export const service = {
    name: 'discovery',
    local: discovery,
    load: async () => {
        discovery.on('neighbor', async (device) => {
            const allDevices = await DeviceRepository.list();
            const adoptedHosts = new Set(allDevices.map((item) => item.host));
            if (device.address && adoptedHosts.has(device.address)) {
                return;
            }
            Service('actionbus').publish('discovery', {
                type: 'neighbor',
                payload: device,
            })
        })
        setInterval(async () => {
            Service('actionbus').publish('discovery', {
                type: 'snapshot',
                payload: {
                    discoveredDevices: await buildDiscoverySnapshot()
                },
            })
        }, 5000);
        await discovery.start();
    },
    cleanup: () => discovery.close()
} satisfies Service<'discovery'>;

export type DiscoveryService = typeof service;

export default await ServiceManager.Load(service, import.meta);
