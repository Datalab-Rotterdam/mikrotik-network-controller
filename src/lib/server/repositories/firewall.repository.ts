import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { firewallRules } from '$lib/server/db/schema';

export type FirewallRuleInsert = typeof firewallRules.$inferInsert;
export type FirewallRule = typeof firewallRules.$inferSelect;

export const FirewallRepository = {
	async listByDevice(deviceId: string): Promise<FirewallRule[]> {
		return db
			.select()
			.from(firewallRules)
			.where(eq(firewallRules.deviceId, deviceId))
			.orderBy(asc(firewallRules.chain), asc(firewallRules.position));
	},

	async listBySite(siteId: string): Promise<FirewallRule[]> {
		return db
			.select()
			.from(firewallRules)
			.where(eq(firewallRules.siteId, siteId))
			.orderBy(asc(firewallRules.chain), asc(firewallRules.position));
	},

	async upsert(input: Omit<FirewallRuleInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
		await db
			.insert(firewallRules)
			.values(input)
			.onConflictDoUpdate({
				target: [firewallRules.deviceId, firewallRules.routerId],
				set: {
					chain: input.chain,
					action: input.action,
					srcAddress: input.srcAddress,
					dstAddress: input.dstAddress,
					protocol: input.protocol,
					srcPort: input.srcPort,
					dstPort: input.dstPort,
					inInterface: input.inInterface,
					outInterface: input.outInterface,
					comment: input.comment,
					disabled: input.disabled,
					position: input.position,
					updatedAt: new Date()
				}
			});
	},

	async deleteByDevice(deviceId: string): Promise<void> {
		await db.delete(firewallRules).where(eq(firewallRules.deviceId, deviceId));
	},

	async deleteByDeviceExcluding(deviceId: string, keepRouterIds: string[]): Promise<void> {
		if (keepRouterIds.length === 0) {
			await FirewallRepository.deleteByDevice(deviceId);
			return;
		}

		const rows = await db
			.select({ routerId: firewallRules.routerId })
			.from(firewallRules)
			.where(eq(firewallRules.deviceId, deviceId));

		const toDelete = rows
			.map((r) => r.routerId)
			.filter((id): id is string => id !== null && !keepRouterIds.includes(id));

		for (const routerId of toDelete) {
			await db
				.delete(firewallRules)
				.where(
					and(eq(firewallRules.deviceId, deviceId), eq(firewallRules.routerId, routerId))
				);
		}
	}
};
