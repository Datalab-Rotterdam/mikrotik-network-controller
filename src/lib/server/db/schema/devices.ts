import { relations, sql } from 'drizzle-orm';
import {
	boolean,
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
import { sites } from './sites';

export const devicePlatform = pgEnum('device_platform', ['routeros', 'switchos']);
export const adoptionMode = pgEnum('adoption_mode', ['read_only', 'managed']);
export const adoptionState = pgEnum('adoption_state', [
	'discovered',
	'credentials_verified',
	'inventoried',
	'backed_up',
	'monitored',
	'fully_managed',
	'failed'
]);
export const connectionStatus = pgEnum('connection_status', [
	'unknown',
	'online',
	'offline',
	'auth_failed',
	'blocked'
]);
export const credentialPurpose = pgEnum('credential_purpose', ['read_only', 'write', 'backup']);

export const devices = pgTable(
	'devices',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
		name: varchar('name', { length: 120 }).notNull(),
		platform: devicePlatform('platform').notNull().default('routeros'),
		adoptionMode: adoptionMode('adoption_mode').notNull().default('read_only'),
		adoptionState: adoptionState('adoption_state').notNull().default('discovered'),
		connectionStatus: connectionStatus('connection_status').notNull().default('unknown'),
		host: varchar('host', { length: 255 }).notNull(),
		apiPort: integer('api_port').notNull().default(8728),
		sshPort: integer('ssh_port').notNull().default(22),
		identity: varchar('identity', { length: 160 }),
		model: varchar('model', { length: 160 }),
		serialNumber: varchar('serial_number', { length: 160 }),
		routerOsVersion: varchar('routeros_version', { length: 80 }),
		architecture: varchar('architecture', { length: 80 }),
		uptimeSeconds: integer('uptime_seconds'),
		capabilities: jsonb('capabilities')
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		tags: jsonb('tags')
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
		lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
		createdAt,
		updatedAt
	},
	(table) => [uniqueIndex('devices_host_unique').on(table.host)]
);

export const deviceCredentials = pgTable('device_credentials', {
	id: uuid('id').primaryKey().defaultRandom(),
	deviceId: uuid('device_id')
		.notNull()
		.references(() => devices.id, { onDelete: 'cascade' }),
	purpose: credentialPurpose('purpose').notNull().default('read_only'),
	username: varchar('username', { length: 160 }).notNull(),
	secretEncrypted: text('secret_encrypted').notNull(),
	isActive: boolean('is_active').notNull().default(true),
	lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
	createdAt,
	updatedAt
});

export const deviceInterfaces = pgTable(
	'device_interfaces',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		routerosId: varchar('routeros_id', { length: 80 }),
		name: varchar('name', { length: 160 }).notNull(),
		type: varchar('type', { length: 80 }),
		macAddress: varchar('mac_address', { length: 32 }),
		comment: text('comment'),
		running: boolean('running').notNull().default(false),
		disabled: boolean('disabled').notNull().default(false),
		createdAt,
		updatedAt
	},
	(table) => [uniqueIndex('device_interfaces_device_name_unique').on(table.deviceId, table.name)]
);

export const devicesRelations = relations(devices, ({ one, many }) => ({
	site: one(sites, {
		fields: [devices.siteId],
		references: [sites.id]
	}),
	credentials: many(deviceCredentials),
	interfaces: many(deviceInterfaces)
}));

export const deviceCredentialsRelations = relations(deviceCredentials, ({ one }) => ({
	device: one(devices, {
		fields: [deviceCredentials.deviceId],
		references: [devices.id]
	})
}));

export const deviceInterfacesRelations = relations(deviceInterfaces, ({ one }) => ({
	device: one(devices, {
		fields: [deviceInterfaces.deviceId],
		references: [devices.id]
	})
}));
