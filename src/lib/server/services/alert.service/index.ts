import {Service} from '@sourceregistry/sveltekit-service-manager';
import {ServiceManager} from '@sourceregistry/sveltekit-service-manager/server';
import AlertRepository from '$lib/server/repositories/alert.repository';
import {OpenEventEmitter} from '$lib/server/helpers/OpenEventEmitter';

export type AlertFiredPayload = {
    id: string;
    ruleId: string;
    siteId: string;
    deviceId: string | null;
    severity: string;
    message: string;
};

export type AlertResolvedPayload = {
    id: string;
    ruleId: string;
    siteId: string;
    deviceId: string | null;
};

export type AlertEventMap = {
    'alert.fired': [AlertFiredPayload];
    'alert.resolved': [AlertResolvedPayload];
};

export const alertEvents = new OpenEventEmitter<AlertEventMap>();

const service = {
    name: 'alert',
    local: (context: { siteId: string }) => ({
        fire: async (input: {
            ruleId: string;
            deviceId?: string | null;
            severity: string;
            message: string;
            metadata: Record<string, unknown>;
        }) => {
            const event = await AlertRepository.events(context).create({
                ruleId: input.ruleId,
                deviceId: input.deviceId,
                message: input.message,
                metadata: input.metadata,
                firedAt: new Date()
            });
            alertEvents.emit('alert.fired', {
                id: event.id,
                ruleId: event.ruleId,
                siteId: context.siteId,
                deviceId: input.deviceId ?? null,
                severity: input.severity,
                message: input.message
            });
            void Service('actionbus').broadcast(`site:${context.siteId}`, {
                type: 'alert.fired',
                payload: {
                    ...event,
                    severity: input.severity,
                    siteId: context.siteId,
                }
            })
            void Service('notification', context).notify({
                id: event.id,
                ruleId: event.ruleId,
                severity: input.severity,
                message: input.message,
                metadata: input.metadata
            });
        },
        resolve: async (input: { ruleId: string; deviceId?: string }) => {
            const open = await AlertRepository.events({siteId: context.siteId}).open({
                ruleId: input.ruleId,
                deviceId: input.deviceId
            });
            if (!open) {
                return;
            }

            await AlertRepository.events({siteId: context.siteId}).resolve(open);

            alertEvents.emit('alert.resolved', {
                id: open.id,
                ruleId: open.ruleId,
                siteId: context.siteId,
                deviceId: open.deviceId
            });

            void Service('actionbus').broadcast(`site:${context.siteId}`, {
                type: 'alert.resolved',
                payload: {
                    id: open.id,
                    ruleId: open.ruleId,
                    siteId: context.siteId,
                    deviceId: open.deviceId
                }
            })
        },
        acknowledge: () => {
            /* not implemented */
        }
    }),
} satisfies Service<'alert'>;

export type AlertService = typeof service;

export default ServiceManager.Load(service, import.meta);
