import { and, asc, count, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { vpnTunnels, wgInterfaces, wgPeers } from '$lib/server/db/schema';

export type WgInterfaceInsert = typeof wgInterfaces.$inferInsert;
export type WgInterface = typeof wgInterfaces.$inferSelect;
export type WgPeerInsert = typeof wgPeers.$inferInsert;
export type WgPeer = typeof wgPeers.$inferSelect;
export type VpnTunnel = typeof vpnTunnels.$inferSelect;
export type VpnTunnelInsert = typeof vpnTunnels.$inferInsert;

export const VpnRepository = {
	// ---- WireGuard interface discovery ----

	async upsertWgInterface(input: Omit<WgInterfaceInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
		await db
			.insert(wgInterfaces)
			.values(input)
			.onConflictDoUpdate({
				target: [wgInterfaces.deviceId, wgInterfaces.routerId],
				set: {
					name: input.name,
					publicKey: input.publicKey,
					listenPort: input.listenPort,
					updatedAt: new Date()
				}
			});
	},

	async deleteWgInterfacesByDeviceExcluding(deviceId: string, keepRouterIds: string[]): Promise<void> {
		if (keepRouterIds.length === 0) {
			await db.delete(wgInterfaces).where(eq(wgInterfaces.deviceId, deviceId));
			return;
		}
		await db
			.delete(wgInterfaces)
			.where(and(eq(wgInterfaces.deviceId, deviceId), notInArray(wgInterfaces.routerId, keepRouterIds)));
	},

	async listWgInterfacesBySite(siteId: string): Promise<WgInterface[]> {
		return db.select().from(wgInterfaces).where(eq(wgInterfaces.siteId, siteId)).orderBy(asc(wgInterfaces.name));
	},

	async getWgInterfaceByDeviceAndName(deviceId: string, name: string): Promise<WgInterface | undefined> {
		const rows = await db
			.select()
			.from(wgInterfaces)
			.where(and(eq(wgInterfaces.deviceId, deviceId), eq(wgInterfaces.name, name)));
		return rows[0];
	},

	// ---- WireGuard peer discovery ----

	async upsertWgPeer(input: Omit<WgPeerInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
		await db
			.insert(wgPeers)
			.values(input)
			.onConflictDoUpdate({
				target: [wgPeers.deviceId, wgPeers.routerId],
				set: {
					interfaceName: input.interfaceName,
					publicKey: input.publicKey,
					endpointAddress: input.endpointAddress,
					endpointPort: input.endpointPort,
					allowedAddresses: input.allowedAddresses,
					lastHandshake: input.lastHandshake,
					rxBytes: input.rxBytes,
					txBytes: input.txBytes,
					updatedAt: new Date()
				}
			});
	},

	async deleteWgPeersByDeviceExcluding(deviceId: string, keepRouterIds: string[]): Promise<void> {
		if (keepRouterIds.length === 0) {
			await db.delete(wgPeers).where(eq(wgPeers.deviceId, deviceId));
			return;
		}
		await db
			.delete(wgPeers)
			.where(and(eq(wgPeers.deviceId, deviceId), notInArray(wgPeers.routerId, keepRouterIds)));
	},

	async listWgPeersBySite(siteId: string): Promise<WgPeer[]> {
		return db.select().from(wgPeers).where(eq(wgPeers.siteId, siteId)).orderBy(asc(wgPeers.interfaceName));
	},

	// ---- Controller-managed VPN tunnels ----

	async createTunnel(input: Omit<VpnTunnelInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<VpnTunnel> {
		const rows = await db.insert(vpnTunnels).values(input).returning();
		return rows[0];
	},

	async findTunnelById(id: string): Promise<VpnTunnel | undefined> {
		const rows = await db.select().from(vpnTunnels).where(eq(vpnTunnels.id, id));
		return rows[0];
	},

	async listTunnelsBySite(siteId: string): Promise<VpnTunnel[]> {
		return db
			.select()
			.from(vpnTunnels)
			.where(and(eq(vpnTunnels.localSiteId, siteId)))
			.orderBy(desc(vpnTunnels.createdAt));
	},

	async listAllTunnels(): Promise<VpnTunnel[]> {
		return db.select().from(vpnTunnels).orderBy(desc(vpnTunnels.createdAt));
	},

	async updateTunnelStatus(
		id: string,
		status: VpnTunnel['status'],
		extra?: Partial<Pick<VpnTunnel, 'localPublicKey' | 'remotePublicKey'>>
	): Promise<void> {
		await db
			.update(vpnTunnels)
			.set({ status, lastStatusAt: new Date(), updatedAt: new Date(), ...extra })
			.where(eq(vpnTunnels.id, id));
	},

	async deleteTunnel(id: string): Promise<void> {
		await db.delete(vpnTunnels).where(eq(vpnTunnels.id, id));
	},

	async countAll(): Promise<number> {
		const [row] = await db.select({ value: count() }).from(vpnTunnels);
		return row?.value ?? 0;
	}
};
