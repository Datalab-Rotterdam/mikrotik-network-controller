import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { configDeployments, configTemplates } from '$lib/server/db/schema';

export type TemplateInsert = typeof configTemplates.$inferInsert;
export type DeploymentInsert = typeof configDeployments.$inferInsert;

// ── Templates ──────────────────────────────────────────────────────────────────

export async function listTemplates(siteId: string) {
	return db
		.select()
		.from(configTemplates)
		.where(eq(configTemplates.siteId, siteId))
		.orderBy(configTemplates.name);
}

export async function getTemplate(id: string) {
	const [row] = await db.select().from(configTemplates).where(eq(configTemplates.id, id));
	return row ?? null;
}

export async function createTemplate(
	input: Omit<TemplateInsert, 'id' | 'createdAt' | 'updatedAt'>
) {
	const [row] = await db.insert(configTemplates).values(input).returning();
	return row;
}

export async function updateTemplate(
	id: string,
	input: Partial<Omit<TemplateInsert, 'id' | 'createdAt' | 'updatedAt'>>
) {
	const [row] = await db
		.update(configTemplates)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(configTemplates.id, id))
		.returning();
	return row ?? null;
}

export async function deleteTemplate(id: string) {
	await db.delete(configTemplates).where(eq(configTemplates.id, id));
}

// ── Deployments ────────────────────────────────────────────────────────────────

export async function listDeployments(templateId: string, limit = 20) {
	return db
		.select()
		.from(configDeployments)
		.where(eq(configDeployments.templateId, templateId))
		.orderBy(desc(configDeployments.createdAt))
		.limit(limit);
}

export async function createDeployment(
	input: Omit<DeploymentInsert, 'id' | 'createdAt'>
) {
	const [row] = await db.insert(configDeployments).values(input).returning();
	return row;
}
