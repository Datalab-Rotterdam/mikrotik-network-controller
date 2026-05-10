import { relations } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { devices } from './devices';
import { sites } from './sites';

export const firewallChain = pgEnum('firewall_chain', ['input', 'forward', 'output']);
export const firewallAction = pgEnum('firewall_action', ['accept', 'drop', 'reject', 'jump', 'return', 'passthrough', 'log']);

export const firewallRules = pgTable(
	'firewall_rules',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
		chain: firewallChain('chain').notNull(),
		action: firewallAction('action').notNull(),
		srcAddress: varchar('src_address', { length: 255 }),
		dstAddress: varchar('dst_address', { length: 255 }),
		protocol: varchar('protocol', { length: 32 }),
		srcPort: varchar('src_port', { length: 64 }),
		dstPort: varchar('dst_port', { length: 64 }),
		inInterface: varchar('in_interface', { length: 160 }),
		outInterface: varchar('out_interface', { length: 160 }),
		comment: varchar('comment', { length: 512 }),
		disabled: boolean('disabled').notNull().default(false),
		position: integer('position').notNull().default(0),
		routerId: varchar('router_id', { length: 64 }),
		createdAt,
		updatedAt
	},
	(table) => [
		uniqueIndex('firewall_rules_device_router_idx').on(table.deviceId, table.routerId)
	]
);

export const firewallRulesRelations = relations(firewallRules, ({ one }) => ({
	device: one(devices, { fields: [firewallRules.deviceId], references: [devices.id] }),
	site: one(sites, { fields: [firewallRules.siteId], references: [sites.id] })
}));
