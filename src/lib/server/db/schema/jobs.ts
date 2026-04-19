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
import { createdAt, updatedAt } from './common';
import { devices } from './devices';
import { users } from './auth';

export const jobStatus = pgEnum('job_status', [
	'queued',
	'running',
	'succeeded',
	'failed',
	'cancelled'
]);

export const jobs = pgTable('jobs', {
	id: uuid('id').primaryKey().defaultRandom(),
	type: varchar('type', { length: 120 }).notNull(),
	status: jobStatus('status').notNull().default('queued'),
	deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
	requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
		onDelete: 'set null'
	}),
	payload: jsonb('payload')
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),
	result: jsonb('result').$type<Record<string, unknown>>(),
	errorMessage: text('error_message'),
	startedAt: timestamp('started_at', { withTimezone: true }),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	createdAt,
	updatedAt
});

export const jobsRelations = relations(jobs, ({ one }) => ({
	device: one(devices, {
		fields: [jobs.deviceId],
		references: [devices.id]
	}),
	requestedByUser: one(users, {
		fields: [jobs.requestedByUserId],
		references: [users.id]
	})
}));
