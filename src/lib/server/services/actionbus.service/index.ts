import type {IncomingMessage} from 'node:http';
import {ServiceManager, type Service} from '@sourceregistry/sveltekit-service-manager/server';
import {createActionBus} from '@sourceregistry/sveltekit-actionbus/server';
import type {ActionChannel, ActionEventForChannel} from '@sourceregistry/sveltekit-actionbus';
import env from '$lib/server/configurations/env.configuration';
import {SessionRepository} from '$lib/server/repositories/session.repository';
import {UserRepository} from '$lib/server/repositories/user.repository';
import {hashSessionToken} from '$lib/server/security/session-token';
import type {ActionEvent, DiscoveryActionEventMap, SiteActionEventMap} from '$lib/shared/action-events';

export type SiteActionEvent = SiteActionEventMap[keyof SiteActionEventMap];
export type DiscoveryActionEvent = DiscoveryActionEventMap[keyof DiscoveryActionEventMap];
export type SiteActionChannel = `site:${string}`;

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

    const session = await SessionRepository.findValidByTokenHash(hashSessionToken(token));
    if (!session) {
        return false;
    }

    const user = await UserRepository.findById(session.userId);
    if (!user || user.disabledAt) {
        return false;
    }

    return true;
}

export function isSiteActionChannel(channel: string): channel is SiteActionChannel {
    return channel.startsWith('site:') && channel.length > 'site:'.length;
}

const server = createActionBus({
    path: '/actionbus',
    authorize: async ({channel, request}) => {
        if (channel !== 'discovery' && !isSiteActionChannel(channel)) {
            return false;
        }

        return isAuthenticated(request);
    }
});

export function siteChannel(siteId: string): SiteActionChannel {
    return `site:${siteId}`;
}

export function channelsForEvent(event: ActionEvent): ActionChannel[] {
    switch (event.type) {
        case 'discovery.snapshot':
        case 'discovery.neighbor':
            return ['discovery'];
        case 'job.snapshot':
        case 'job.updated':
        case 'device.adopted':
        case 'device.updated':
        case 'device.removed':
        case 'metric.updated':
        case 'client.updated':
        case 'alert.fired':
        case 'alert.resolved':
        case 'topology.updated': {
            const siteId = 'siteId' in event.payload ? event.payload.siteId : null;
            return siteId ? [siteChannel(siteId)] : [];
        }
        default:
            return [];
    }
}

export const service = {
    name: 'actionbus',
    local: {
        publish<Channel extends ActionChannel>(channel: Channel, event: ActionEventForChannel<Channel>): void {
            server.broadcast(channel, event);
        },
        publishSite(siteId: string | null | undefined, event: SiteActionEvent): void {
            if (!siteId) {
                return;
            }

            server.broadcast(
                siteChannel(siteId),
                event as unknown as ActionEventForChannel<SiteActionChannel>
            );
        },
        publishDiscovery(event: DiscoveryActionEvent): void {
            server.broadcast('discovery', event as unknown as ActionEventForChannel<'discovery'>);
        },
        publishEvent(event: ActionEvent): void {
            for (const channel of channelsForEvent(event)) {
                server.broadcast(channel, event as unknown as ActionEventForChannel<typeof channel>);
            }
        }
    },
    cleanup: () => server.destroy()
} satisfies Service<'actionbus'>;

export type ActionBusService = typeof service;

export default ServiceManager.Load(service, import.meta);
