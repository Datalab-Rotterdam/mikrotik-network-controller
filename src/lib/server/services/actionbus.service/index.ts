import type {IncomingMessage} from 'node:http';
import {Service as ResolveService, type Service} from '@sourceregistry/sveltekit-service-manager';
import {ServiceManager} from '@sourceregistry/sveltekit-service-manager/server';
import {type ActionEventForChannel} from '@sourceregistry/sveltekit-actionbus';
import {createActionBus} from '@sourceregistry/sveltekit-actionbus/server';
import env from '$lib/server/configurations/env.configuration';
import '$lib/server/services/devices.service';
import {monitoringEvents} from '$lib/server/services/monitoring.service';

import {getActiveClientCountBySite} from '$lib/server/repositories/clients.repository';
import {getJobWithSteps} from '$lib/server/repositories/job.repository';
import {getLatestDeviceMetric} from '$lib/server/repositories/metrics.repository';
import type {DeviceEventMap} from '$lib/server/services/devices.service/modules/event.module';
import type {MonitoringEventMap} from '$lib/server/services/monitoring.service';
import type {OpenListener} from '$lib/server/helpers/OpenEventEmitter';

type DiscoveryChannel = 'discovery';
type SiteChannel = `site:${string}`;
type PlatformChannel = DiscoveryChannel | SiteChannel;
type DiscoveryEvent = ActionEventForChannel<DiscoveryChannel>;
type SiteEvent = ActionEventForChannel<SiteChannel>;
type PlatformEvent = DiscoveryEvent | SiteEvent;

type DeviceAdoptedPayload = Extract<SiteEvent, { type: 'device.adopted' }>['payload'];
type DeviceUpdatedPayload = Extract<SiteEvent, { type: 'device.updated' }>['payload'];
type DeviceRemovedPayload = Extract<SiteEvent, { type: 'device.removed' }>['payload'];
type MetricUpdatedEvent = Extract<SiteEvent, { type: 'metric.updated' }>;
type ClientUpdatedEvent = Extract<SiteEvent, { type: 'client.updated' }>;
type TopologyUpdatedEvent = Extract<SiteEvent, { type: 'topology.updated' }>;
type AlertFiredEvent = Extract<SiteEvent, { type: 'alert.fired' }>;
type AlertResolvedEvent = Extract<SiteEvent, { type: 'alert.resolved' }>;
type JobUpdatedEvent = Extract<SiteEvent, { type: 'job.updated' }>;
type SerializedJob = JobUpdatedEvent['payload']['job'];
type SerializedStep = SerializedJob['steps'][number];

type MonitoringMetricDetail = {
    deviceId: string;
    siteId: string | null;
    collectedAt: Date;
};

type MonitoringClientDetail = {
    siteId: string | null;
};

type MonitoringTopologyDetail = {
    siteId: string | null;
};

type AlertFiredPayload = AlertFiredEvent['payload'];
type AlertResolvedPayload = AlertResolvedEvent['payload'];
type SchedulerDetail = {
    jobId: string;
};

function parseCookieHeader(header: string | undefined): Record<string, string> {
    if (!header) {
        return {};
    }

    return Object.fromEntries(
        header
            .split(';')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
                const separator = entry.indexOf('=');
                if (separator === -1) {
                    return [entry, ''];
                }

                try {
                    return [
                        decodeURIComponent(entry.slice(0, separator)),
                        decodeURIComponent(entry.slice(separator + 1))
                    ];
                } catch {
                    return [entry.slice(0, separator), entry.slice(separator + 1)];
                }
            })
    );
}

async function isAuthenticated(request: IncomingMessage | undefined): Promise<boolean> {
    const cookies = parseCookieHeader(request?.headers.cookie);
    const token = cookies[env.SESSION_COOKIE_NAME];
    if (!token) {
        return false;
    }

    return Boolean(await ResolveService('authentication').resolveUser({token}));
}

export function isSiteActionChannel(channel: string): channel is SiteChannel {
    return channel.startsWith('site:') && channel.length > 'site:'.length;
}

export function siteChannel(siteId: string): SiteChannel {
    return `site:${siteId}`;
}

export function channelsForEvent(event: PlatformEvent): PlatformChannel[] {
    if (event.type === 'discovery.neighbor' || event.type === 'discovery.snapshot') {
        return ['discovery'];
    }

    const siteId = 'siteId' in event.payload ? event.payload.siteId : null;
    return siteId ? [siteChannel(siteId)] : [];
}

function serializeDate(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeStep(
    step: NonNullable<Awaited<ReturnType<typeof getJobWithSteps>>>['steps'][number]
): SerializedStep {
    return {
        id: step.id,
        jobId: step.jobId,
        index: step.index,
        name: step.name,
        status: step.status,
        result: step.result,
        errorMessage: step.errorMessage,
        revertResult: step.revertResult ?? null,
        revertErrorMessage: step.revertErrorMessage,
        startedAt: serializeDate(step.startedAt),
        finishedAt: serializeDate(step.finishedAt),
        revertedAt: serializeDate(step.revertedAt),
        createdAt: serializeDate(step.createdAt) ?? new Date(0).toISOString(),
        updatedAt: serializeDate(step.updatedAt) ?? new Date(0).toISOString()
    };
}

function serializeJob(job: NonNullable<Awaited<ReturnType<typeof getJobWithSteps>>>): SerializedJob {
    return {
        id: job.id,
        type: job.type,
        status: job.status,
        deviceId: job.deviceId,
        siteId: job.siteId,
        requestedByUserId: job.requestedByUserId,
        progress: job.progress,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
        payload: job.payload,
        result: job.result ?? null,
        errorMessage: job.errorMessage,
        scheduledFor: serializeDate(job.scheduledFor),
        lockedAt: serializeDate(job.lockedAt),
        lockedBy: job.lockedBy,
        startedAt: serializeDate(job.startedAt),
        finishedAt: serializeDate(job.finishedAt),
        createdAt: serializeDate(job.createdAt) ?? new Date(0).toISOString(),
        updatedAt: serializeDate(job.updatedAt) ?? new Date(0).toISOString(),
        steps: job.steps.map(serializeStep)
    };
}

const actionbus = createActionBus({
    path: '/actionbus',
    authorize: async ({channel, request}) => {
        if (channel !== 'discovery' && !isSiteActionChannel(channel)) {
            return false;
        }

        return isAuthenticated(request);
    }
});

function broadcastEvent(event: PlatformEvent): void {
    for (const channel of channelsForEvent(event)) {
        actionbus.broadcast(channel, event as ActionEventForChannel<typeof channel>);
    }
}


function handleDeviceAdopted(payload: DeviceAdoptedPayload): void {
    broadcastEvent({
        type: 'device.adopted',
        payload
    });
}

function handleDeviceUpdated(payload: DeviceUpdatedPayload): void {
    broadcastEvent({
        type: 'device.updated',
        payload
    });
}

function handleDeviceRemoved(payload: DeviceRemovedPayload): void {
    broadcastEvent({
        type: 'device.removed',
        payload
    });
}

async function handleMetricUpdated(detail: MonitoringMetricDetail): Promise<void> {
    const metric = await getLatestDeviceMetric(detail.deviceId);
    if (!metric) {
        return;
    }

    const event: MetricUpdatedEvent = {
        type: 'metric.updated',
        payload: {
            deviceId: detail.deviceId,
            siteId: detail.siteId,
            cpuPercent: metric.cpuPercent,
            freeMemoryBytes: metric.freeMemoryBytes,
            totalMemoryBytes: metric.totalMemoryBytes,
            temperatureCelsius: metric.temperatureCelsius,
            uptimeSeconds: metric.uptimeSeconds,
            collectedAt: detail.collectedAt.toISOString()
        }
    };

    broadcastEvent(event);
}

async function handleClientUpdated(detail: MonitoringClientDetail): Promise<void> {
    if (!detail.siteId) {
        return;
    }

    const activeCount = await getActiveClientCountBySite(detail.siteId);
    const event: ClientUpdatedEvent = {
        type: 'client.updated',
        payload: {
            siteId: detail.siteId,
            activeCount
        }
    };

    broadcastEvent(event);
}

function handleTopologyUpdated(detail: MonitoringTopologyDetail): void {
    if (!detail.siteId) {
        return;
    }

    const event: TopologyUpdatedEvent = {
        type: 'topology.updated',
        payload: {
            siteId: detail.siteId
        }
    };

    broadcastEvent(event);
}

function handleAlertFired(payload: AlertFiredPayload): void {
    const event: AlertFiredEvent = {
        type: 'alert.fired',
        payload
    };

    broadcastEvent(event);
}

function handleAlertResolved(payload: AlertResolvedPayload): void {
    const event: AlertResolvedEvent = {
        type: 'alert.resolved',
        payload
    };

    broadcastEvent(event);
}

async function handleSchedulerEvent(detail: SchedulerDetail): Promise<void> {
    const job = await getJobWithSteps(detail.jobId);
    if (!job) {
        return;
    }

    const event: JobUpdatedEvent = {
        type: 'job.updated',
        payload: {
            siteId: job.siteId,
            job: serializeJob(job)
        }
    };

    broadcastEvent(event);
}

const handleDeviceEvent: OpenListener<DeviceEventMap> = (eventName, ...args) => {
    const payload = args[0];
    switch (eventName) {
        case 'device.adopted':
            handleDeviceAdopted(payload as DeviceAdoptedPayload);
            return;
        case 'device.updated':
            handleDeviceUpdated(payload as DeviceUpdatedPayload);
            return;
        case 'device.removed':
            handleDeviceRemoved(payload as DeviceRemovedPayload);
            return;
    }
};

const handleMonitoringEvent: OpenListener<MonitoringEventMap> = (eventName, ...args) => {
    const payload = args[0];
    switch (eventName) {
        case 'metric:updated':
            void handleMetricUpdated(payload as MonitoringMetricDetail).catch(() => {
                /* ignore broadcast failures */
            });
            return;
        case 'client:updated':
            void handleClientUpdated(payload as MonitoringClientDetail).catch(() => {
                /* ignore broadcast failures */
            });
            return;
        case 'topology:updated':
            handleTopologyUpdated(payload as MonitoringTopologyDetail);
            return;
    }
};

ResolveService('devices').event.any(handleDeviceEvent);
monitoringEvents.any(handleMonitoringEvent);

export const service = {
    name: 'actionbus',
    local: {
        broadcast: actionbus.broadcast
    },
    cleanup: () => actionbus.destroy()
} satisfies Service<'actionbus'>;

export type ActionBusService = typeof service;

export default await ServiceManager.Load(service, import.meta);
