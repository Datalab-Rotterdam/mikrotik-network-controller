import { relations, sql } from 'drizzle-orm';
import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { devices } from './devices';
import { sites } from './sites';
import { users } from './auth';

export const jobStatus = pgEnum('job_status', [
	'queued',
	'running',
	'succeeded',
	'failed',
	'cancelled',
	'rolling_back',
	'reverted',
	'revert_failed',
	'needs_attention'
]);

export const jobStepStatus = pgEnum('job_step_status', [
	'queued',
	'running',
	'succeeded',
	'failed',
	'reverting',
	'reverted',
	'revert_failed',
	'revert_skipped'
]);

export const jobs = pgTable('jobs', {
	id: uuid('id').primaryKey().defaultRandom(),
	type: varchar('type', { length: 120 }).notNull(),
	status: jobStatus('status').notNull().default('queued'),
	deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
	siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
	requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
		onDelete: 'set null'
	}),
	progress: integer('progress').notNull().default(0),
	attemptCount: integer('attempt_count').notNull().default(0),
	maxAttempts: integer('max_attempts').notNull().default(1),
	payload: jsonb('payload')
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),
	result: jsonb('result').$type<Record<string, unknown>>(),
	errorMessage: text('error_message'),
	scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
	lockedAt: timestamp('locked_at', { withTimezone: true }),
	lockedBy: varchar('locked_by', { length: 120 }),
	startedAt: timestamp('started_at', { withTimezone: true }),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	createdAt,
	updatedAt
});

export const jobSteps = pgTable(
	'job_steps',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		jobId: uuid('job_id')
			.notNull()
			.references(() => jobs.id, { onDelete: 'cascade' }),
		index: integer('index').notNull(),
		name: varchar('name', { length: 160 }).notNull(),
		status: jobStepStatus('status').notNull().default('queued'),
		result: jsonb('result')
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		errorMessage: text('error_message'),
		revertResult: jsonb('revert_result').$type<Record<string, unknown>>(),
		revertErrorMessage: text('revert_error_message'),
		startedAt: timestamp('started_at', { withTimezone: true }),
		finishedAt: timestamp('finished_at', { withTimezone: true }),
		revertedAt: timestamp('reverted_at', { withTimezone: true }),
		createdAt,
		updatedAt
	},
	(table) => [uniqueIndex('job_steps_job_index_unique').on(table.jobId, table.index)]
);

export const jobsRelations = relations(jobs, ({ one, many }) => ({
	device: one(devices, {
		fields: [jobs.deviceId],
		references: [devices.id]
	}),
	site: one(sites, {
		fields: [jobs.siteId],
		references: [sites.id]
	}),
	requestedByUser: one(users, {
		fields: [jobs.requestedByUserId],
		references: [users.id]
	}),
	steps: many(jobSteps)
}));

export const jobStepsRelations = relations(jobSteps, ({ one }) => ({
	job: one(jobs, {
		fields: [jobSteps.jobId],
		references: [jobs.id]
	})
}));
