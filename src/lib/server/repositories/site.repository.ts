import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { sites } from '$lib/server/db/schema';

export type SiteRecord = typeof sites.$inferSelect;

export async function listSites(): Promise<SiteRecord[]> {
	return db.select().from(sites).orderBy(asc(sites.name));
}

export async function findSiteByName(name: string): Promise<SiteRecord | undefined> {
	const [site] = await db.select().from(sites).where(eq(sites.name, name)).limit(1);

	return site;
}

export async function createSite(name: string): Promise<SiteRecord> {
	const [site] = await db.insert(sites).values({ name }).returning();

	return site;
}

export async function ensureSiteByName(name: string): Promise<SiteRecord> {
	return (await findSiteByName(name)) ?? (await createSite(name));
}
