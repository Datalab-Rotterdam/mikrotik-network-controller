import {and, desc, eq, isNull} from 'drizzle-orm';
import {db} from '$lib/server/db/client';
import {
    alertEvents,
    alertRuleChannels,
    alertRules,
    notificationChannels
} from '$lib/server/db/schema';

export type AlertRuleInsert = typeof alertRules.$inferInsert;
export type AlertEventInsert = typeof alertEvents.$inferInsert;
export type NotificationChannelInsert = typeof notificationChannels.$inferInsert;

export const AlertRepository = {
    events: (context: { siteId: string }) => ({
        list: (input: { limit: number } = {limit: 100}) => db
            .select()
            .from(alertEvents)
            .where(eq(alertEvents.siteId, context.siteId))
            .orderBy(desc(alertEvents.firedAt))
            .limit(input.limit),
        create: (input: Omit<AlertEventInsert, 'id' | 'createdAt' | 'siteId'>) => db.insert(alertEvents).values({
            ...input,
            siteId: context.siteId,
        }).returning().then(([row]) => row),
        active: () => db
            .select()
            .from(alertEvents)
            .where(and(eq(alertEvents.siteId, context.siteId), isNull(alertEvents.resolvedAt)))
            .orderBy(desc(alertEvents.firedAt)),
        unacknowledged: () => db
            .select()
            .from(alertEvents)
            .where(
                and(
                    eq(alertEvents.siteId, context.siteId),
                    isNull(alertEvents.resolvedAt),
                    isNull(alertEvents.acknowledgedAt)
                )
            ),
        open: async (input: { ruleId: string, deviceId?: string | null }) => {
            const conditions = [eq(alertEvents.ruleId, input.ruleId), isNull(alertEvents.resolvedAt)];
            if (input.deviceId) conditions.push(eq(alertEvents.deviceId, input.deviceId));
            const [row] = await db
                .select()
                .from(alertEvents)
                .where(and(...conditions))
                .orderBy(desc(alertEvents.firedAt))
                .limit(1);
            return row ?? null;
        },
        mostRecent: async (input: { ruleId: string, deviceId?: string | null }) => {
            const conditions = [eq(alertEvents.ruleId, input.ruleId)];
            if (input.deviceId) conditions.push(eq(alertEvents.deviceId, input.deviceId));
            const [row] = await db
                .select()
                .from(alertEvents)
                .where(and(...conditions))
                .orderBy(desc(alertEvents.firedAt))
                .limit(1);
            return row ?? null;
        },
        resolve: (input: { id: string }) => db
            .update(alertEvents)
            .set({resolvedAt: new Date()})
            .where(eq(alertEvents.id, input.id))
            .returning().then(([row]) => row ?? null),
        acknowledge: (input: { id: string, userId: string }) => db
            .update(alertEvents)
            .set({acknowledgedAt: new Date(), acknowledgedByUserId: input.userId})
            .where(eq(alertEvents.id, input.id))
            .returning().then(([row]) => row ?? null),
    }),
    rules: {
        list: (input: { siteId: string }) =>
            db.select().from(alertRules).where(eq(alertRules.siteId, input.siteId)).orderBy(alertRules.name),
        get: (input: { ruleId: string }) =>
            db.select().from(alertRules).where(eq(alertRules.id, input.ruleId)).then(([row]) => row ?? null),
        create: (input: Omit<AlertRuleInsert, 'id' | 'createdAt' | 'updatedAt'>) =>
            db.insert(alertRules).values(input).returning().then(([row]) => row),
        update: (id: string, input: Partial<Omit<AlertRuleInsert, 'id' | 'createdAt' | 'updatedAt'>>) =>
            db
                .update(alertRules)
                .set({...input, updatedAt: new Date()})
                .where(eq(alertRules.id, id))
                .returning().then(([row]) => row ?? null),
        delete: async (id: string) => {
            await db.delete(alertRules).where(eq(alertRules.id, id));
        }
    },
    channels: (context: { siteId: string }) => ({
        list: () => db
            .select()
            .from(notificationChannels)
            .where(eq(notificationChannels.siteId, context.siteId))
            .orderBy(notificationChannels.name),
        get: (input: { id: string }) => db
            .select()
            .from(notificationChannels)
            .where(and(eq(notificationChannels.id, input.id), eq(notificationChannels.siteId, context.siteId)))
            .then(([row]) => row ?? null),
        delete: async (input: { id: string }) => {
            await db.delete(notificationChannels).where(and(eq(notificationChannels.id, input.id), eq(notificationChannels.siteId, context.siteId)));
        },
        create: (input: Omit<NotificationChannelInsert, 'id' | 'createdAt' | 'updatedAt' | 'siteId'>) => db.insert(notificationChannels).values({
            ...input,
            siteId: context.siteId,
        }).returning().then(([row]) => row),
        update: (id: string, input: Partial<NotificationChannelInsert>) => db
            .update(notificationChannels)
            .set({...input, updatedAt: new Date()})
            .where(and(eq(notificationChannels.id, id), eq(notificationChannels.siteId, context.siteId)))
            .returning().then(([row]) => row),
        getByRule: async (input: { id: string }) => {
            const links = await db
                .select({channelId: alertRuleChannels.channelId})
                .from(alertRuleChannels)
                .where(eq(alertRuleChannels.ruleId, input.id));

            if (links.length === 0) return [];

            const ids = links.map((l) => l.channelId);
            const channels = await Promise.all(ids.map((id) => AlertRepository.channels(context).get({id})));
            return channels.filter(Boolean);
        },
        rules: {
            set: async (input: { channelIds: string | string[], ruleId: string }) => {
                await db.delete(alertRuleChannels).where(eq(alertRuleChannels.ruleId, input.ruleId));
                if (!Array.isArray(input.channelIds)) input.channelIds = [input.channelIds]
                if (input.channelIds.length > 0) {
                    await db
                        .insert(alertRuleChannels)
                        .values(input.channelIds.map((channelId) => ({ruleId: input.ruleId, channelId})));
                }
            },
        }
    })
}


export default AlertRepository;
