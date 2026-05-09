import {ServiceManager} from "@sourceregistry/sveltekit-service-manager/server";
import AlertRepository from "$lib/server/repositories/alert.repository";
import {dispatch, hasDispatchType} from "$lib/server/services/notification.service/dispatchers";

export type Notification = {
    id?: string,
    ruleId: string,
    severity: string,
    message: string,
    metadata: Record<string, unknown>
}

const service = {
    name: "notification",
    local: (context: { siteId: string }) => ({
        notify: async (notification: Notification) => {
            const channels = await AlertRepository.channels(context).getByRule({id: notification.ruleId});
            await Promise.allSettled(
                channels
                    .filter((ch) => ch.enabled)
                    .map(async (channel) => {
                        if (!hasDispatchType(channel.type)) return;
                        switch (channel.type) {
                            case 'webhook': {
                                await dispatch(channel.type, channel.config, notification);
                                break;
                            }
                            case 'slack': {
                                const emoji = notification.severity === 'critical' ? ':red_circle:' : notification.severity === 'warning' ? ':warning:' : ':information_source:';
                                await dispatch(channel.type, channel.config, {
                                    message: `${emoji} *[${notification.severity.toUpperCase()}]* ${notification.message}`
                                });
                                break;
                            }
                            case 'email': {
                                await dispatch(channel.type, channel.config, {
                                    subject: `[${notification.severity.toUpperCase()}] Alert: ${notification.message}`,
                                    body: `Alert triggered at ${new Date().toISOString()}\n\nSeverity: ${notification.severity}\nMessage: ${notification.message}\nRule ID: ${notification.ruleId}`
                                });
                                break;
                            }
                        }
                    })
            );
        }
    }),
}

export type NotificationService = typeof service;

export default await ServiceManager.Load(service, import.meta)
