import { relations, sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { devices } from './devices';
import { users } from './auth';

export const auditEvents = pgTable('audit_events', {
	id: uuid('id').primaryKey().defaultRandom(),
	actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
	targetDeviceId: uuid('target_device_id').references(() => devices.id, { onDelete: 'set null' }),
	action: varchar('action', { length: 160 }).notNull(),
	message: text('message'),
	metadata: jsonb('metadata')
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
	actorUser: one(users, {
		fields: [auditEvents.actorUserId],
		references: [users.id]
	}),
	targetDevice: one(devices, {
		fields: [auditEvents.targetDeviceId],
		references: [devices.id]
	})
}));
