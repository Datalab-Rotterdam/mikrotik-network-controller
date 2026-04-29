import { relations } from 'drizzle-orm';
import {
	boolean,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { sites } from './sites';
import { devices } from './devices';
import { users } from './auth';

export const alertConditionType = pgEnum('alert_condition_type', [
	'device_offline',
	'cpu_above',
	'memory_below',
	'temperature_above',
	'interface_down',
	'client_count_above',
	'client_count_below'
]);

export const alertSeverity = pgEnum('alert_severity', ['info', 'warning', 'critical']);

export const notificationChannelType = pgEnum('notification_channel_type', [
	'webhook',
	'slack',
	'email'
]);

export const alertRules = pgTable('alert_rules', {
	id: uuid('id').primaryKey().defaultRandom(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 200 }).notNull(),
	enabled: boolean('enabled').notNull().default(true),
	conditionType: alertConditionType('condition_type').notNull(),
	conditionParams: jsonb('condition_params').$type<Record<string, unknown>>().notNull().default({}),
	scope: jsonb('scope')
		.$type<{ deviceIds?: string[] }>()
		.notNull()
		.default({}),
	severity: alertSeverity('severity').notNull().default('warning'),
	cooldownSeconds: integer('cooldown_seconds').notNull().default(300),
	createdAt,
	updatedAt
});

export const alertEvents = pgTable('alert_events', {
	id: uuid('id').primaryKey().defaultRandom(),
	ruleId: uuid('rule_id')
		.notNull()
		.references(() => alertRules.id, { onDelete: 'cascade' }),
	deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
	siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
	firedAt: timestamp('fired_at', { withTimezone: true }).notNull().defaultNow(),
	resolvedAt: timestamp('resolved_at', { withTimezone: true }),
	acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
	acknowledgedByUserId: uuid('acknowledged_by_user_id').references(() => users.id, {
		onDelete: 'set null'
	}),
	message: text('message').notNull(),
	metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
	createdAt
});

export const notificationChannels = pgTable('notification_channels', {
	id: uuid('id').primaryKey().defaultRandom(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 200 }).notNull(),
	type: notificationChannelType('type').notNull(),
	config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	enabled: boolean('enabled').notNull().default(true),
	createdAt,
	updatedAt
});

export const alertRuleChannels = pgTable('alert_rule_channels', {
	ruleId: uuid('rule_id')
		.notNull()
		.references(() => alertRules.id, { onDelete: 'cascade' }),
	channelId: uuid('channel_id')
		.notNull()
		.references(() => notificationChannels.id, { onDelete: 'cascade' })
});

export const alertRulesRelations = relations(alertRules, ({ one, many }) => ({
	site: one(sites, { fields: [alertRules.siteId], references: [sites.id] }),
	events: many(alertEvents),
	ruleChannels: many(alertRuleChannels)
}));

export const alertEventsRelations = relations(alertEvents, ({ one }) => ({
	rule: one(alertRules, { fields: [alertEvents.ruleId], references: [alertRules.id] }),
	device: one(devices, { fields: [alertEvents.deviceId], references: [devices.id] }),
	site: one(sites, { fields: [alertEvents.siteId], references: [sites.id] }),
	acknowledgedBy: one(users, {
		fields: [alertEvents.acknowledgedByUserId],
		references: [users.id]
	})
}));

export const notificationChannelsRelations = relations(notificationChannels, ({ one, many }) => ({
	site: one(sites, { fields: [notificationChannels.siteId], references: [sites.id] }),
	ruleChannels: many(alertRuleChannels)
}));

export const alertRuleChannelsRelations = relations(alertRuleChannels, ({ one }) => ({
	rule: one(alertRules, { fields: [alertRuleChannels.ruleId], references: [alertRules.id] }),
	channel: one(notificationChannels, {
		fields: [alertRuleChannels.channelId],
		references: [notificationChannels.id]
	})
}));
