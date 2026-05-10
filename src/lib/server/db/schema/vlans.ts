import { relations } from 'drizzle-orm';
import { integer, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { devices } from './devices';
import { sites } from './sites';

export const vlans = pgTable(
	'vlans',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
		vlanId: integer('vlan_id').notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		interfaceName: varchar('interface_name', { length: 160 }),
		comment: varchar('comment', { length: 512 }),
		routerId: varchar('router_id', { length: 64 }),
		createdAt,
		updatedAt
	},
	(table) => [
		uniqueIndex('vlans_device_router_idx').on(table.deviceId, table.routerId)
	]
);

export const vlansRelations = relations(vlans, ({ one }) => ({
	device: one(devices, { fields: [vlans.deviceId], references: [devices.id] }),
	site: one(sites, { fields: [vlans.siteId], references: [sites.id] })
}));
