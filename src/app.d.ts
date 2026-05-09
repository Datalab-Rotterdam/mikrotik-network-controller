// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {DevicesService} from "$lib/server/services/devices.service";
import type {SchedulerService} from "$lib/server/services/scheduler.service";
import type {ActionBusService} from "$lib/server/services/actionbus.service";
import type {
    ActionDiscoveryDevice,
    ActionJob,
    ClientUpdatedPayload,
    DeviceMetricPayload,
    TopologyUpdatedPayload
} from "$lib/shared/action-events";
import type {AlertService, AlertResolvedPayload, AlertFiredPayload} from "$lib/server/services/alert.service";
import type {NotificationService} from "$lib/server/services/notification.service";
import type {AuthenticationService} from "$lib/server/services/authentication.service";
import type {
    DeviceAdoptedPayload, DeviceRemovedPayload, DeviceUpdatedPayload
} from "$lib/server/services/devices.service/modules/event.module.ts";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user: import('$lib/server/services/authentication.service').AuthenticatedUser | null;
        }

        interface PageData {
            user: import('$lib/server/services/authentication.service').AuthenticatedUser | null;
            pathname?: string;
        }

        interface Services {
            devices: DevicesService
            scheduler: SchedulerService
            actionbus: ActionBusService
            alert: AlertService
            notification: NotificationService,
            authentication: AuthenticationService,
        }

        interface ActionEvents {
            'site:${string}': {
                'job.snapshot': {
                    siteId: string;
                    jobs: ActionJob[];
                };
                'job.updated': {
                    siteId: string | null;
                    job: ActionJob;
                };
                'device.adopted': DeviceAdoptedPayload
                'device.updated': DeviceUpdatedPayload
                'device.removed': DeviceRemovedPayload
                'metric.updated': DeviceMetricPayload
                'client.updated': ClientUpdatedPayload
                'alert.fired': AlertFiredPayload
                'alert.resolved': AlertResolvedPayload
                'topology.updated': TopologyUpdatedPayload
            };

            discovery: {
                'discovery.snapshot': {
                    discoveredDevices: ActionDiscoveryDevice[];
                };
                'discovery.neighbor': ActionDiscoveryDevice;
                'device.adopted': DeviceAdoptedPayload;
            };
        }

        // interface PageState {}
        // interface Platform {}
    }
}

export {};
