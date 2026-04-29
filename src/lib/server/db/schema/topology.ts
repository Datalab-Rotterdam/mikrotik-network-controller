import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { devices } from './devices';
import { sites } from './sites';

export const topologyDiscoveryMethod = pgEnum('topology_discovery_method', [
	'lldp',
	'cdp',
	'neighbor'
]);

export const topologyLinks = pgTable(
	'topology_links',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
		sourceDeviceId: uuid('source_device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		sourceInterface: varchar('source_interface', { length: 160 }),
		targetDeviceId: uuid('target_device_id').references(() => devices.id, {
			onDelete: 'cascade'
		}),
		targetHost: varchar('target_host', { length: 255 }),
		targetInterface: varchar('target_interface', { length: 160 }),
		targetIdentity: varchar('target_identity', { length: 160 }),
		discoveredVia: topologyDiscoveryMethod('discovered_via').notNull().default('neighbor'),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('topology_links_unique').on(
			table.sourceDeviceId,
			table.sourceInterface,
			table.targetHost
		)
	]
);

export const topologyLinksRelations = relations(topologyLinks, ({ one }) => ({
	site: one(sites, { fields: [topologyLinks.siteId], references: [sites.id] }),
	sourceDevice: one(devices, {
		fields: [topologyLinks.sourceDeviceId],
		references: [devices.id],
		relationName: 'source'
	}),
	targetDevice: one(devices, {
		fields: [topologyLinks.targetDeviceId],
		references: [devices.id],
		relationName: 'target'
	})
}));
