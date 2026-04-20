import { relations, sql } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt } from './common';
import { devices } from './devices';
import { sites } from './sites';

export const syslogSeverity = pgEnum('syslog_severity', [
	'emergency',
	'alert',
	'critical',
	'error',
	'warning',
	'notice',
	'info',
	'debug'
]);

export const syslogCategories = {
	adopt: 'adopt',
	discovery: 'discovery',
	device: 'device',
	security: 'security',
	system: 'system',
	backup: 'backup'
} as const;

export type SyslogCategory = typeof syslogCategories[keyof typeof syslogCategories];

export const syslogEvents = pgTable(
	'syslog_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
		siteId: uuid('site_id')
			.references(() => sites.id, { onDelete: 'cascade' })
			.notNull(),
		severity: syslogSeverity('severity').notNull().default('info'),
		category: varchar('category', { length: 80 }).notNull(),
		title: varchar('title', { length: 255 }).notNull(),
		message: text('message').notNull(),
		metadata: jsonb('metadata')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('syslog_events_id_unique').on(table.id),
		uniqueIndex('syslog_events_site_created_idx').on(table.siteId, table.createdAt),
		uniqueIndex('syslog_events_device_created_idx').on(table.deviceId, table.createdAt),
		uniqueIndex('syslog_events_severity_idx').on(table.severity)
	]
);

export const syslogEventsRelations = relations(syslogEvents, ({ one }) => ({
	device: one(devices, {
		fields: [syslogEvents.deviceId],
		references: [devices.id]
	}),
	site: one(sites, {
		fields: [syslogEvents.siteId],
		references: [sites.id]
	})
}));
