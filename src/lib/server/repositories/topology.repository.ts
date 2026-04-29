import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { topologyLinks } from '$lib/server/db/schema';

export type TopologyLinkUpsert = {
	siteId: string | null;
	sourceDeviceId: string;
	sourceInterface: string | null;
	targetDeviceId: string | null;
	targetHost: string;
	targetInterface: string | null;
	targetIdentity: string | null;
	discoveredVia: 'lldp' | 'cdp' | 'neighbor';
};

export async function upsertTopologyLinks(links: TopologyLinkUpsert[]): Promise<void> {
	if (links.length === 0) return;

	await db
		.insert(topologyLinks)
		.values(
			links.map((l) => ({
				siteId: l.siteId,
				sourceDeviceId: l.sourceDeviceId,
				sourceInterface: l.sourceInterface,
				targetDeviceId: l.targetDeviceId,
				targetHost: l.targetHost,
				targetInterface: l.targetInterface,
				targetIdentity: l.targetIdentity,
				discoveredVia: l.discoveredVia,
				lastSeenAt: new Date()
			}))
		)
		.onConflictDoUpdate({
			target: [topologyLinks.sourceDeviceId, topologyLinks.sourceInterface, topologyLinks.targetHost],
			set: {
				targetDeviceId: sql`EXCLUDED.target_device_id`,
				targetInterface: sql`EXCLUDED.target_interface`,
				targetIdentity: sql`EXCLUDED.target_identity`,
				discoveredVia: sql`EXCLUDED.discovered_via`,
				lastSeenAt: sql`EXCLUDED.last_seen_at`
			}
		});
}

export async function getTopologyForSite(siteId: string) {
	return db
		.select()
		.from(topologyLinks)
		.where(eq(topologyLinks.siteId, siteId));
}
