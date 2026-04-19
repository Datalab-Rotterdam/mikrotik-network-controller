import { pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';

export const sites = pgTable(
	'sites',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 120 }).notNull(),
		description: text('description'),
		location: text('location'),
		createdAt,
		updatedAt
	},
	(table) => [uniqueIndex('sites_name_unique').on(table.name)]
);
