import { relations, sql } from 'drizzle-orm';
import {
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { adoptionMode, devices } from './devices';
import { sites } from './sites';
import { users } from './auth';
import { createdAt, updatedAt } from './common';

export const adoptionAttemptStatus = pgEnum('adoption_attempt_status', [
	'pending',
	'validating_credentials',
	'syncing_inventory',
	'creating_backup',
	'succeeded',
	'failed'
]);

export const adoptionAttempts = pgTable('adoption_attempts', {
	id: uuid('id').primaryKey().defaultRandom(),
	siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
	deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
	requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
		onDelete: 'set null'
	}),
	status: adoptionAttemptStatus('status').notNull().default('pending'),
	mode: adoptionMode('mode').notNull().default('read_only'),
	host: varchar('host', { length: 255 }).notNull(),
	username: varchar('username', { length: 160 }).notNull(),
	errorMessage: text('error_message'),
	progress: jsonb('progress')
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),
	startedAt: timestamp('started_at', { withTimezone: true }),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	createdAt,
	updatedAt
});

export const adoptionAttemptsRelations = relations(adoptionAttempts, ({ one }) => ({
	site: one(sites, {
		fields: [adoptionAttempts.siteId],
		references: [sites.id]
	}),
	device: one(devices, {
		fields: [adoptionAttempts.deviceId],
		references: [devices.id]
	}),
	requestedByUser: one(users, {
		fields: [adoptionAttempts.requestedByUserId],
		references: [users.id]
	})
}));
