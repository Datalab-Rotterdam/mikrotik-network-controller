// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {DevicesService} from "$lib/server/services/devices.service";
import type {SchedulerService} from "$lib/server/services/scheduler.service";
import type {AlertsService} from "$lib/server/services/alerts.service";
import type {AuthService} from "$lib/server/services/auth.service";
import type {DiscoveryService} from "$lib/server/services/discovery.service";
import type {MonitoringService} from "$lib/server/services/monitoring.service";
import type {NotificationService} from "$lib/server/services/notification.service";
import type {ActionBusService} from "$lib/server/services/actionbus.service";
import type {SyslogService} from "$lib/server/services/syslog.service";
import type {AgentService} from "$lib/server/services/agent.service";
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
	SyslogEventPayload,
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
            alerts: AlertsService
            auth: AuthService
            agent: AgentService
            discovery: DiscoveryService
            devices: DevicesService
            monitoring: MonitoringService
            notification: NotificationService
            scheduler: SchedulerService
            actionbus: ActionBusService
            syslog: SyslogService
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
                'device.adopted': ActionDeviceAdoptedPayload;
                'device.updated': ActionDeviceUpdatedPayload;
                'device.removed': ActionDeviceRemovedPayload;
                'metric.updated': DeviceMetricPayload;
                'client.updated': ClientUpdatedPayload;
                'alert.fired': AlertFiredPayload;
                'alert.resolved': AlertResolvedPayload;
                'topology.updated': TopologyUpdatedPayload;
                'syslog.event': SyslogEventPayload;
            };
            discovery: {
                'snapshot': {
                    discoveredDevices: ActionDiscoveryDevice[];
                };
                'neighbor': ActionDiscoveryDevice;
                'adopted': ActionDeviceAdoptedPayload;
            };
        }

        // interface PageState {}
        // interface Platform {}
    }
}

export {};
