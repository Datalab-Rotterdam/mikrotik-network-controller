import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { sites } from '$lib/server/db/schema';

export type SiteRecord = typeof sites.$inferSelect;

export const SiteRepository = {
	async list(): Promise<SiteRecord[]> {
		return db.select().from(sites).orderBy(asc(sites.name));
	},

	async findById(id: string): Promise<SiteRecord | undefined> {
		const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);

		return site;
	},

	async findByName(name: string): Promise<SiteRecord | undefined> {
		const [site] = await db.select().from(sites).where(eq(sites.name, name)).limit(1);

		return site;
	},

	async create(name: string, location?: string): Promise<SiteRecord> {
		const [site] = await db.insert(sites).values({ name, location: location || null }).returning();

		return site;
	},

	async ensureByName(name: string, location?: string): Promise<SiteRecord> {
		return (await SiteRepository.findByName(name)) ?? (await SiteRepository.create(name, location));
	}
};
