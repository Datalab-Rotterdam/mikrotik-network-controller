import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { configDeployments, configTemplates } from '$lib/server/db/schema';

export type TemplateInsert = typeof configTemplates.$inferInsert;
export type DeploymentInsert = typeof configDeployments.$inferInsert;

export const TemplateRepository = {
	// ── Templates ──────────────────────────────────────────────────────────────────

	async list(siteId: string) {
		return db
			.select()
			.from(configTemplates)
			.where(eq(configTemplates.siteId, siteId))
			.orderBy(configTemplates.name);
	},

	async get(id: string) {
		const [row] = await db.select().from(configTemplates).where(eq(configTemplates.id, id));
		return row ?? null;
	},

	async create(input: Omit<TemplateInsert, 'id' | 'createdAt' | 'updatedAt'>) {
		const [row] = await db.insert(configTemplates).values(input).returning();
		return row;
	},

	async update(
		id: string,
		input: Partial<Omit<TemplateInsert, 'id' | 'createdAt' | 'updatedAt'>>
	) {
		const [row] = await db
			.update(configTemplates)
			.set({ ...input, updatedAt: new Date() })
			.where(eq(configTemplates.id, id))
			.returning();
		return row ?? null;
	},

	async delete(id: string) {
		await db.delete(configTemplates).where(eq(configTemplates.id, id));
	},

	// ── Deployments ────────────────────────────────────────────────────────────────

	async listDeployments(templateId: string, limit = 20) {
		return db
			.select()
			.from(configDeployments)
			.where(eq(configDeployments.templateId, templateId))
			.orderBy(desc(configDeployments.createdAt))
			.limit(limit);
	},

	async createDeployment(input: Omit<DeploymentInsert, 'id' | 'createdAt'>) {
		const [row] = await db.insert(configDeployments).values(input).returning();
		return row;
	}
};
