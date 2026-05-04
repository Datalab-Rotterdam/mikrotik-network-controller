// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {DevicesService} from "$lib/server/services/devices.service";
import type {SchedulerService} from "$lib/server/services/scheduler.service";
import type {Action} from "@sourceregistry/sveltekit-actionbus";
import type {ActionBusService} from "$lib/server/services/actionbus.service";
import type {
	ActionDeviceAdoptedPayload,
	ActionDeviceRemovedPayload,
	ActionDeviceUpdatedPayload,
	ActionDiscoveryDevice,
	ActionJob,
	AlertFiredPayload,
	AlertResolvedPayload,
	ClientUpdatedPayload,
	DeviceMetricPayload,
	TopologyUpdatedPayload
} from "$lib/shared/action-events";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user: import('$lib/server/services/auth.service').AuthenticatedUser | null;
        }

        interface PageData {
            user: import('$lib/server/services/auth.service').AuthenticatedUser | null;
            pathname?: string;
        }

        interface Services {
            devices: DevicesService
            scheduler: SchedulerService
            actionbus: ActionBusService
        }

        interface ActionEvents {
            'site:${string}': {
                'job.snapshot': Action<{
                    siteId: string;
                    jobs: ActionJob[];
                }>;
                'job.updated': Action<{
                    siteId: string | null;
                    job: ActionJob;
                }>;
                'device.adopted': Action<ActionDeviceAdoptedPayload>;
                'device.updated': Action<ActionDeviceUpdatedPayload>;
                'device.removed': Action<ActionDeviceRemovedPayload>;
                'metric.updated': Action<DeviceMetricPayload>;
                'client.updated': Action<ClientUpdatedPayload>;
                'alert.fired': Action<AlertFiredPayload>;
                'alert.resolved': Action<AlertResolvedPayload>;
                'topology.updated': Action<TopologyUpdatedPayload>;
            };
            discovery: {
                'discovery.snapshot': Action<{
                    discoveredDevices: ActionDiscoveryDevice[];
                }>;
                'discovery.neighbor': Action<ActionDiscoveryDevice>;
                'device.adopted': Action<ActionDeviceAdoptedPayload>;
            };
        }

        // interface PageState {}
        // interface Platform {}
    }
}

export {};
