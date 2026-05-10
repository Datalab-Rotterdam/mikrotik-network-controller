import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { vlans } from '$lib/server/db/schema';

export type VlanInsert = typeof vlans.$inferInsert;
export type Vlan = typeof vlans.$inferSelect;

export const VlanRepository = {
	async listByDevice(deviceId: string): Promise<Vlan[]> {
		return db
			.select()
			.from(vlans)
			.where(eq(vlans.deviceId, deviceId))
			.orderBy(asc(vlans.vlanId));
	},

	async listBySite(siteId: string): Promise<Vlan[]> {
		return db
			.select()
			.from(vlans)
			.where(eq(vlans.siteId, siteId))
			.orderBy(asc(vlans.vlanId));
	},

	async upsert(input: Omit<VlanInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
		await db
			.insert(vlans)
			.values(input)
			.onConflictDoUpdate({
				target: [vlans.deviceId, vlans.routerId],
				set: {
					vlanId: input.vlanId,
					name: input.name,
					interfaceName: input.interfaceName,
					comment: input.comment,
					updatedAt: new Date()
				}
			});
	},

	async deleteByDevice(deviceId: string): Promise<void> {
		await db.delete(vlans).where(eq(vlans.deviceId, deviceId));
	},

	async deleteByDeviceExcluding(deviceId: string, keepRouterIds: string[]): Promise<void> {
		if (keepRouterIds.length === 0) {
			await VlanRepository.deleteByDevice(deviceId);
			return;
		}

		const rows = await db
			.select({ routerId: vlans.routerId })
			.from(vlans)
			.where(eq(vlans.deviceId, deviceId));

		const toDelete = rows
			.map((r) => r.routerId)
			.filter((id): id is string => id !== null && !keepRouterIds.includes(id));

		for (const routerId of toDelete) {
			await db
				.delete(vlans)
				.where(and(eq(vlans.deviceId, deviceId), eq(vlans.routerId, routerId)));
		}
	}
};
