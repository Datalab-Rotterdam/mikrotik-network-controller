import { relations } from 'drizzle-orm';
import { bigint, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { devices } from './devices';
import { sites } from './sites';

// ---- Discovered WireGuard interfaces (populated by monitoring) ----

export const wgInterfaces = pgTable(
	'wg_interfaces',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
		routerId: varchar('router_id', { length: 64 }).notNull(),
		name: varchar('name', { length: 160 }).notNull(),
		publicKey: varchar('public_key', { length: 512 }),
		listenPort: integer('listen_port'),
		createdAt,
		updatedAt
	},
	(t) => [uniqueIndex('wg_interfaces_device_router_idx').on(t.deviceId, t.routerId)]
);

export const wgInterfacesRelations = relations(wgInterfaces, ({ one }) => ({
	device: one(devices, { fields: [wgInterfaces.deviceId], references: [devices.id] }),
	site: one(sites, { fields: [wgInterfaces.siteId], references: [sites.id] })
}));

// ---- Discovered WireGuard peers (populated by monitoring) ----

export const wgPeers = pgTable(
	'wg_peers',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
		routerId: varchar('router_id', { length: 64 }).notNull(),
		interfaceName: varchar('interface_name', { length: 160 }),
		publicKey: varchar('public_key', { length: 512 }),
		endpointAddress: varchar('endpoint_address', { length: 255 }),
		endpointPort: integer('endpoint_port'),
		allowedAddresses: varchar('allowed_addresses', { length: 512 }),
		lastHandshake: varchar('last_handshake', { length: 64 }),
		rxBytes: bigint('rx_bytes', { mode: 'number' }),
		txBytes: bigint('tx_bytes', { mode: 'number' }),
		createdAt,
		updatedAt
	},
	(t) => [uniqueIndex('wg_peers_device_router_idx').on(t.deviceId, t.routerId)]
);

export const wgPeersRelations = relations(wgPeers, ({ one }) => ({
	device: one(devices, { fields: [wgPeers.deviceId], references: [devices.id] }),
	site: one(sites, { fields: [wgPeers.siteId], references: [sites.id] })
}));

// ---- Controller-managed VPN tunnels ----

export const vpnProtocol = pgEnum('vpn_protocol', ['wireguard']);
export const vpnTunnelStatus = pgEnum('vpn_tunnel_status', ['provisioning', 'active', 'error', 'removing']);

export const vpnTunnels = pgTable('vpn_tunnels', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 120 }).notNull(),
	protocol: vpnProtocol('protocol').notNull().default('wireguard'),
	status: vpnTunnelStatus('status').notNull().default('provisioning'),

	localDeviceId: uuid('local_device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
	remoteDeviceId: uuid('remote_device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
	localSiteId: uuid('local_site_id').references(() => sites.id, { onDelete: 'set null' }),
	remoteSiteId: uuid('remote_site_id').references(() => sites.id, { onDelete: 'set null' }),

	localInterfaceName: varchar('local_interface_name', { length: 160 }),
	remoteInterfaceName: varchar('remote_interface_name', { length: 160 }),
	localTunnelAddress: varchar('local_tunnel_address', { length: 64 }),
	remoteTunnelAddress: varchar('remote_tunnel_address', { length: 64 }),
	localNetworkRange: varchar('local_network_range', { length: 64 }),
	remoteNetworkRange: varchar('remote_network_range', { length: 64 }),
	localPublicKey: varchar('local_public_key', { length: 512 }),
	remotePublicKey: varchar('remote_public_key', { length: 512 }),
	listenPort: integer('listen_port').notNull().default(13231),

	lastStatusAt: timestamp('last_status_at'),
	createdAt,
	updatedAt
});

export const vpnTunnelsRelations = relations(vpnTunnels, ({ one }) => ({
	localDevice: one(devices, { fields: [vpnTunnels.localDeviceId], references: [devices.id] }),
	remoteDevice: one(devices, { fields: [vpnTunnels.remoteDeviceId], references: [devices.id] }),
	localSite: one(sites, { fields: [vpnTunnels.localSiteId], references: [sites.id], relationName: 'localSite' }),
	remoteSite: one(sites, { fields: [vpnTunnels.remoteSiteId], references: [sites.id], relationName: 'remoteSite' })
}));
