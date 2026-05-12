import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { firmwareVersions } from '$lib/server/db/schema';

export type FirmwareVersionRow = typeof firmwareVersions.$inferSelect;

export const FirmwareRepository = {
	async upsertVersion(input: {
		deviceId: string;
		currentVersion: string | null;
		latestVersion: string | null;
		channel: 'stable' | 'testing' | 'long-term';
		updateAvailable: boolean;
	}) {
		const [row] = await db
			.insert(firmwareVersions)
			.values({
				deviceId: input.deviceId,
				currentVersion: input.currentVersion,
				latestVersion: input.latestVersion,
				channel: input.channel,
				updateAvailable: input.updateAvailable,
				checkedAt: new Date()
			})
			.onConflictDoUpdate({
				target: firmwareVersions.deviceId,
				set: {
					currentVersion: input.currentVersion,
					latestVersion: input.latestVersion,
					channel: input.channel,
					updateAvailable: input.updateAvailable,
					checkedAt: new Date(),
					updatedAt: new Date()
				}
			})
			.returning();
		return row;
	},

	async getVersion(deviceId: string) {
		const [row] = await db
			.select()
			.from(firmwareVersions)
			.where(eq(firmwareVersions.deviceId, deviceId));
		return row ?? null;
	},

	async getVersionsForDevices(deviceIds: string[]) {
		if (deviceIds.length === 0) return [];
		return db
			.select()
			.from(firmwareVersions)
			.where(inArray(firmwareVersions.deviceId, deviceIds));
	}
};
