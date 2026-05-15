import emailDispatch, {type EmailConfig} from "$lib/server/services/notification.service/dispatchers/email.dispatch";
import slackDispatch, {type SlackConfig} from "$lib/server/services/notification.service/dispatchers/slack.dispatch";
import webhookDispatch, {
    type WebhookConfig
} from "$lib/server/services/notification.service/dispatchers/webhook.dispatch";
import {Service, ServiceManager} from '@sourceregistry/sveltekit-service-manager';
import {AlertRepository} from '$lib/server/repositories/alerts.repository';


type AlertFiredDetail = {
    eventId: string;
    ruleId: string;
    siteId: string;
    deviceId: string | null;
    severity: string;
    message: string;
};


async function notifyChannels(
    ruleId: string,
    severity: string,
    message: string,
    metadata: Record<string, unknown>
): Promise<void> {
    const channels = await AlertRepository.getChannelsForRule(ruleId);

    await Promise.allSettled(
        channels
            .filter((ch) => ch.enabled)
            .map(async (channel) => {
                const cfg = channel.config as Record<string, unknown>;
                if (channel.type === 'webhook') {
                    await webhookDispatch(cfg as WebhookConfig, {
                        severity,
                        message,
                        ruleId,
                        timestamp: new Date().toISOString(),
                        ...metadata
                    });
                } else if (channel.type === 'slack') {
                    const emoji = severity === 'critical' ? ':red_circle:' : severity === 'warning' ? ':warning:' : ':information_source:';
                    await slackDispatch(
                        cfg as SlackConfig,
                        `${emoji} *[${severity.toUpperCase()}]* ${message}`
                    );
                } else if (channel.type === 'email') {
                    await emailDispatch(
                        cfg as EmailConfig,
                        `[${severity.toUpperCase()}] Alert: ${message}`,
                        `Alert triggered at ${new Date().toISOString()}\n\nSeverity: ${severity}\nMessage: ${message}\nRule ID: ${ruleId}`
                    );
                }
            })
    );
}

let started = false;

function handleAlertFired(detail: AlertFiredDetail): void {
    void notifyChannels(detail.ruleId, detail.severity, detail.message, {
        eventId: detail.eventId,
        deviceId: detail.deviceId,
        siteId: detail.siteId
    }).catch(() => {
        /* ignore notification failures */
    });
}


export const service = {
    name: 'notification',
    dependsOn: ['alerts'],
    local: {
        start: () => {
            if (started) return;
            started = true;
            Service('alerts').events.on('alert:fired', handleAlertFired);
        },
        stop: () => {
            if (!started) return;
            Service('alerts').events.off('alert:fired', handleAlertFired);
            started = false;
        }
    },
    cleanup: () => {
        if (!started) return;
        Service('alerts').events.removeListener('alert:fired', handleAlertFired)
        started = false;
    }
} satisfies Service<'notification'>;

export type NotificationService = typeof service;

export default await ServiceManager.Load(service, import.meta);
