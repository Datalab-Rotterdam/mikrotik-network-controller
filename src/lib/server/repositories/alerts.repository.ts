import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
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
	// ── Alert Rules ────────────────────────────────────────────────────────────────

	async listRules(siteId: string) {
		return db.select().from(alertRules).where(eq(alertRules.siteId, siteId)).orderBy(alertRules.name);
	},

	async getRule(id: string) {
		const [row] = await db.select().from(alertRules).where(eq(alertRules.id, id));
		return row ?? null;
	},

	async createRule(input: Omit<AlertRuleInsert, 'id' | 'createdAt' | 'updatedAt'>) {
		const [row] = await db.insert(alertRules).values(input).returning();
		return row;
	},

	async updateRule(
		id: string,
		input: Partial<Omit<AlertRuleInsert, 'id' | 'createdAt' | 'updatedAt'>>
	) {
		const [row] = await db
			.update(alertRules)
			.set({ ...input, updatedAt: new Date() })
			.where(eq(alertRules.id, id))
			.returning();
		return row ?? null;
	},

	async deleteRule(id: string) {
		await db.delete(alertRules).where(eq(alertRules.id, id));
	},

	// ── Alert Events ───────────────────────────────────────────────────────────────

	async listEvents(siteId: string, limit = 100) {
		return db
			.select()
			.from(alertEvents)
			.where(eq(alertEvents.siteId, siteId))
			.orderBy(desc(alertEvents.firedAt))
			.limit(limit);
	},

	async listActiveEvents(siteId: string) {
		return db
			.select()
			.from(alertEvents)
			.where(and(eq(alertEvents.siteId, siteId), isNull(alertEvents.resolvedAt)))
			.orderBy(desc(alertEvents.firedAt));
	},

	async countUnacknowledged(siteId: string): Promise<number> {
		const rows = await db
			.select()
			.from(alertEvents)
			.where(
				and(
					eq(alertEvents.siteId, siteId),
					isNull(alertEvents.resolvedAt),
					isNull(alertEvents.acknowledgedAt)
				)
			)
		return rows.length;
	},

	async getOpenAlertCountsBySite() {
		const rows = await db
			.select({ siteId: alertEvents.siteId, total: count() })
			.from(alertEvents)
			.where(and(isNull(alertEvents.resolvedAt), isNull(alertEvents.acknowledgedAt)))
			.groupBy(alertEvents.siteId);

		return new Map(rows.map((r) => [r.siteId, Number(r.total)]));
	},

	async getOpenEvent(ruleId: string, deviceId: string | null) {
		const conditions = [eq(alertEvents.ruleId, ruleId), isNull(alertEvents.resolvedAt)];
		if (deviceId) conditions.push(eq(alertEvents.deviceId, deviceId));
		const [row] = await db
			.select()
			.from(alertEvents)
			.where(and(...conditions))
			.orderBy(desc(alertEvents.firedAt))
			.limit(1);
		return row ?? null;
	},

	async getMostRecentFiredEvent(ruleId: string, deviceId: string | null) {
		const conditions = [eq(alertEvents.ruleId, ruleId)];
		if (deviceId) conditions.push(eq(alertEvents.deviceId, deviceId));
		const [row] = await db
			.select()
			.from(alertEvents)
			.where(and(...conditions))
			.orderBy(desc(alertEvents.firedAt))
			.limit(1);
		return row ?? null;
	},

	async createEvent(input: Omit<AlertEventInsert, 'id' | 'createdAt'>) {
		const [row] = await db.insert(alertEvents).values(input).returning();
		return row;
	},

	async resolveEvent(id: string) {
		const [row] = await db
			.update(alertEvents)
			.set({ resolvedAt: new Date() })
			.where(eq(alertEvents.id, id))
			.returning();
		return row ?? null;
	},

	async acknowledgeEvent(id: string, userId: string) {
		const [row] = await db
			.update(alertEvents)
			.set({ acknowledgedAt: new Date(), acknowledgedByUserId: userId })
			.where(eq(alertEvents.id, id))
			.returning();
		return row ?? null;
	},

	// ── Notification Channels ──────────────────────────────────────────────────────

	async listChannels(siteId: string) {
		return db
			.select()
			.from(notificationChannels)
			.where(eq(notificationChannels.siteId, siteId))
			.orderBy(notificationChannels.name);
	},

	async getChannel(id: string) {
		const [row] = await db
			.select()
			.from(notificationChannels)
			.where(eq(notificationChannels.id, id));
		return row ?? null;
	},

	async createChannel(input: Omit<NotificationChannelInsert, 'id' | 'createdAt' | 'updatedAt'>) {
		const [row] = await db.insert(notificationChannels).values(input).returning();
		return row;
	},

	async updateChannel(
		id: string,
		input: Partial<Omit<NotificationChannelInsert, 'id' | 'createdAt' | 'updatedAt'>>
	) {
		const [row] = await db
			.update(notificationChannels)
			.set({ ...input, updatedAt: new Date() })
			.where(eq(notificationChannels.id, id))
			.returning();
		return row ?? null;
	},

	async deleteChannel(id: string) {
		await db.delete(notificationChannels).where(eq(notificationChannels.id, id));
	},

	// ── Rule ↔ Channel links ───────────────────────────────────────────────────────

	async getChannelsForRule(ruleId: string) {
		const links = await db
			.select({ channelId: alertRuleChannels.channelId })
			.from(alertRuleChannels)
			.where(eq(alertRuleChannels.ruleId, ruleId));

		if (links.length === 0) return [];

		const ids = links.map((l) => l.channelId);
		const channels = await Promise.all(ids.map((id) => AlertRepository.getChannel(id)));
		return channels.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof AlertRepository.getChannel>>>[];
	},

	async setRuleChannels(ruleId: string, channelIds: string[]) {
		await db.delete(alertRuleChannels).where(eq(alertRuleChannels.ruleId, ruleId));
		if (channelIds.length > 0) {
			await db
				.insert(alertRuleChannels)
				.values(channelIds.map((channelId) => ({ ruleId, channelId })));
		}
	}
};
