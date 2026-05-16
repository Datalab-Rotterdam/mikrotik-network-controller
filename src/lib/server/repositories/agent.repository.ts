import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { deviceInstallTokens } from '$lib/server/db/schema';

export type InstallToken = typeof deviceInstallTokens.$inferSelect;

export const AgentRepository = {
	async createInstallToken(input: {
		token: string;
		siteId: string;
		createdByUserId: string;
		expiresAt: Date;
	}): Promise<InstallToken> {
		const [row] = await db.insert(deviceInstallTokens).values(input).returning();
		return row;
	},

	async findValidToken(token: string): Promise<InstallToken | null> {
		const [row] = await db
			.select()
			.from(deviceInstallTokens)
			.where(
				and(
					eq(deviceInstallTokens.token, token),
					isNull(deviceInstallTokens.claimedAt),
					gt(deviceInstallTokens.expiresAt, new Date())
				)
			);
		return row ?? null;
	},

	async claimToken(token: string, deviceId: string): Promise<void> {
		await db
			.update(deviceInstallTokens)
			.set({ claimedAt: new Date(), deviceId })
			.where(eq(deviceInstallTokens.token, token));
	},

	async listBySite(siteId: string): Promise<InstallToken[]> {
		return db
			.select()
			.from(deviceInstallTokens)
			.where(eq(deviceInstallTokens.siteId, siteId))
			.orderBy(deviceInstallTokens.createdAt);
	}
};
