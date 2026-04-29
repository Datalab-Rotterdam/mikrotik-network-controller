import { relations } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { sites } from './sites';
import { devices } from './devices';
import { jobs } from './jobs';

export const templatePlatform = pgEnum('template_platform', ['routeros', 'capsman']);

export const configTemplates = pgTable('config_templates', {
	id: uuid('id').primaryKey().defaultRandom(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 200 }).notNull(),
	description: text('description'),
	platform: templatePlatform('platform').notNull().default('routeros'),
	content: text('content').notNull().default(''),
	variables: jsonb('variables')
		.$type<Array<{ name: string; label: string; type: string; default?: string; required?: boolean }>>()
		.notNull()
		.default([]),
	createdAt,
	updatedAt
});

export const configDeployments = pgTable('config_deployments', {
	id: uuid('id').primaryKey().defaultRandom(),
	templateId: uuid('template_id')
		.notNull()
		.references(() => configTemplates.id, { onDelete: 'cascade' }),
	deviceId: uuid('device_id')
		.notNull()
		.references(() => devices.id, { onDelete: 'cascade' }),
	jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
	renderedContent: text('rendered_content'),
	variables: jsonb('variables').$type<Record<string, string>>().notNull().default({}),
	result: jsonb('result').$type<Record<string, unknown>>().notNull().default({}),
	createdAt
});

export const configTemplatesRelations = relations(configTemplates, ({ one, many }) => ({
	site: one(sites, { fields: [configTemplates.siteId], references: [sites.id] }),
	deployments: many(configDeployments)
}));

export const configDeploymentsRelations = relations(configDeployments, ({ one }) => ({
	template: one(configTemplates, {
		fields: [configDeployments.templateId],
		references: [configTemplates.id]
	}),
	device: one(devices, { fields: [configDeployments.deviceId], references: [devices.id] }),
	job: one(jobs, { fields: [configDeployments.jobId], references: [jobs.id] })
}));
