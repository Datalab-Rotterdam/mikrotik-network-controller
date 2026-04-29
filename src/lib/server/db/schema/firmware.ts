import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { devices } from './devices';

export const firmwareChannel = pgEnum('firmware_channel', ['stable', 'testing', 'long-term']);

export const firmwareVersions = pgTable('firmware_versions', {
	id: uuid('id').primaryKey().defaultRandom(),
	deviceId: uuid('device_id')
		.notNull()
		.unique()
		.references(() => devices.id, { onDelete: 'cascade' }),
	currentVersion: varchar('current_version', { length: 80 }),
	latestVersion: varchar('latest_version', { length: 80 }),
	channel: firmwareChannel('channel').notNull().default('stable'),
	updateAvailable: boolean('update_available').notNull().default(false),
	checkedAt: timestamp('checked_at', { withTimezone: true }),
	createdAt,
	updatedAt
});

export const firmwareVersionsRelations = relations(firmwareVersions, ({ one }) => ({
	device: one(devices, {
		fields: [firmwareVersions.deviceId],
		references: [devices.id]
	})
}));
