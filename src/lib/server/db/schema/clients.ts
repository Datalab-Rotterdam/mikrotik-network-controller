import {
	boolean,
	integer,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { devices } from './devices';
import { sites } from './sites';

export const deviceClients = pgTable(
	'device_clients',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
		macAddress: varchar('mac_address', { length: 32 }).notNull(),
		ipAddress: varchar('ip_address', { length: 64 }),
		hostname: varchar('hostname', { length: 255 }),
		interfaceName: varchar('interface_name', { length: 160 }),
		isWireless: boolean('is_wireless').notNull().default(false),
		ssid: varchar('ssid', { length: 255 }),
		signalStrength: integer('signal_strength'),
		firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
		active: boolean('active').notNull().default(true),
		createdAt,
		updatedAt
	},
	(table) => [
		uniqueIndex('device_clients_device_mac_unique').on(table.deviceId, table.macAddress)
	]
);
