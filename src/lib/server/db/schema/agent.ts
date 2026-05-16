import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt } from './common';
import { sites } from './sites';
import { users } from './auth';
import { devices } from './devices';

export const deviceInstallTokens = pgTable(
	'device_install_tokens',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		token: varchar('token', { length: 64 }).notNull(),
		siteId: uuid('site_id')
			.notNull()
			.references(() => sites.id, { onDelete: 'cascade' }),
		createdByUserId: uuid('created_by_user_id').references(() => users.id, {
			onDelete: 'set null'
		}),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		claimedAt: timestamp('claimed_at', { withTimezone: true }),
		deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
		createdAt
	},
	(table) => [uniqueIndex('device_install_tokens_token_unique').on(table.token)]
);

export const deviceInstallTokensRelations = relations(deviceInstallTokens, ({ one }) => ({
	site: one(sites, { fields: [deviceInstallTokens.siteId], references: [sites.id] }),
	createdBy: one(users, {
		fields: [deviceInstallTokens.createdByUserId],
		references: [users.id]
	}),
	device: one(devices, { fields: [deviceInstallTokens.deviceId], references: [devices.id] })
}));
