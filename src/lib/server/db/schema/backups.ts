import { relations } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt } from './common';
import { devices } from './devices';
import { jobs } from './jobs';

export const backupKind = pgEnum('backup_kind', ['export', 'binary']);

export const backups = pgTable('backups', {
	id: uuid('id').primaryKey().defaultRandom(),
	deviceId: uuid('device_id')
		.notNull()
		.references(() => devices.id, { onDelete: 'cascade' }),
	jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
	kind: backupKind('kind').notNull().default('export'),
	filePath: text('file_path').notNull(),
	sha256: varchar('sha256', { length: 64 }),
	sizeBytes: integer('size_bytes'),
	encrypted: boolean('encrypted').notNull().default(true),
	restorePoint: boolean('restore_point').notNull().default(false),
	collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
	createdAt
});

export const backupsRelations = relations(backups, ({ one }) => ({
	device: one(devices, {
		fields: [backups.deviceId],
		references: [devices.id]
	}),
	job: one(jobs, {
		fields: [backups.jobId],
		references: [jobs.id]
	})
}));
