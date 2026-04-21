// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {DevicesService} from "$lib/server/services/devices.service";
import type {SchedulerService} from "$lib/server/services/scheduler.service";
import type {
	ActionDeviceAdoptedPayload,
	ActionDiscoveryDevice,
	ActionJob
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
        }

        interface ActionEvents {
            'job.snapshot': {
                type: 'job.snapshot';
                payload: {
                    siteId: string;
                    jobs: ActionJob[];
                };
            };
            'job.updated': {
                type: 'job.updated';
                payload: {
                    siteId: string | null;
                    job: ActionJob;
                };
            };
            'discovery.snapshot': {
                type: 'discovery.snapshot';
                payload: {
                    discoveredDevices: ActionDiscoveryDevice[];
                };
            };
            'discovery.neighbor': {
                type: 'discovery.neighbor';
                payload: ActionDiscoveryDevice;
            };
            'device.adopted': {
                type: 'device.adopted';
                payload: ActionDeviceAdoptedPayload;
            };
        }

        // interface PageState {}
        // interface Platform {}
    }
}

export {};
