import { AnyEventEmitter } from '$lib/server/utilities/AnyEventEmitter';
import { deviceEvents, type DeviceEventMap } from './emitter';
import { Router, Service, ServiceManager, type ServiceRouter } from '@sourceregistry/sveltekit-service-manager';
import { adoption, telemetry, provisioning, credentials, removal, config, terminal, type ServiceModuleContext } from './modules';

const router = Router();

const moduleContext: ServiceModuleContext = {
    get eventEmitter(): AnyEventEmitter<DeviceEventMap> {
        return deviceEvents;
    },
    get router(): ServiceRouter {
        return router;
    }
};

export const service = {
    name: "devices",
    dependsOn: ["scheduler"],
    route: router,
    load: () => {
        deviceEvents.any((event, payload) => {
            if (!payload.siteId) return;
            switch (event) {
                case "device.adopted": {
                    Service('actionbus').publish(`site:${payload.siteId}`, {
                        type: 'device.adopted',
                        payload
                    })
                    break;
                }
                case 'device.updated': {
                    Service('actionbus').publish(`site:${payload.siteId}`, {
                        type: 'device.updated',
                        payload
                    })
                    break;
                }
                case 'device.removed': {
                    Service('actionbus').publish(`site:${payload.siteId}`, {
                        type: 'device.removed',
                        payload
                    })
                    break;
                }
            }

        })
    },
    local: {
        adoption: adoption(moduleContext),
        telemetry: telemetry(moduleContext),
        provisioning: provisioning(moduleContext),
        credentials: credentials(moduleContext),
        removal: removal(moduleContext),
        config: config(moduleContext),
        terminal: terminal(moduleContext),
    }
} satisfies Service<"devices">;

export type DevicesService = typeof service;

export default ServiceManager.Load(service, import.meta);
