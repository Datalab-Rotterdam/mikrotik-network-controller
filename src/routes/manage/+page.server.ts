import { redirect } from '@sveltejs/kit';
import { and, count, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { alertEvents, deviceClients, devices, sites } from '$lib/server/db/schema';
import { listSites } from '$lib/server/repositories/site.repository';

async function getSiteAggregates() {
	const [deviceRows, clientRows, alertRows] = await Promise.all([
		db
			.select({
				siteId: devices.siteId,
				total: count(),
				online: sql<number>`sum(case when ${devices.connectionStatus} = 'online' then 1 else 0 end)::int`
			})
			.from(devices)
			.where(sql`${devices.siteId} is not null`)
			.groupBy(devices.siteId),

		db
			.select({ siteId: deviceClients.siteId, total: count() })
			.from(deviceClients)
			.where(and(eq(deviceClients.active, true), sql`${deviceClients.siteId} is not null`))
			.groupBy(deviceClients.siteId),

		db
			.select({ siteId: alertEvents.siteId, total: count() })
			.from(alertEvents)
			.where(and(isNull(alertEvents.resolvedAt), isNull(alertEvents.acknowledgedAt)))
			.groupBy(alertEvents.siteId)
	]);

	const deviceMap = new Map(deviceRows.map((r) => [r.siteId, r]));
	const clientMap = new Map(clientRows.map((r) => [r.siteId, r.total]));
	const alertMap = new Map(alertRows.map((r) => [r.siteId, r.total]));

	return { deviceMap, clientMap, alertMap };
}

export async function load({ locals, url }) {
	if (!locals.user) throw redirect(303, `/manage/account/login?redirectTo=${url.pathname}`);

	const q = url.searchParams.get('q')?.trim() ?? '';

	const [allSites, { deviceMap, clientMap, alertMap }] = await Promise.all([
		listSites(),
		getSiteAggregates()
	]);

	const siteRows = allSites.map((s) => {
		const dev = deviceMap.get(s.id);
		const total = dev?.total ?? 0;
		const online = dev?.online ?? 0;
		return {
			id: s.id,
			name: s.name,
			location: s.location,
			deviceTotal: total,
			deviceOnline: online,
			deviceOffline: total - online,
			activeClients: clientMap.get(s.id) ?? 0,
			openAlerts: alertMap.get(s.id) ?? 0
		};
	});

	let clientResults: {
		id: string;
		macAddress: string;
		ipAddress: string | null;
		hostname: string | null;
		siteId: string | null;
		siteName: string | null;
		deviceId: string;
		deviceName: string | null;
		interfaceName: string | null;
		isWireless: boolean;
		lastSeenAt: Date;
	}[] = [];

	if (q.length >= 2) {
		clientResults = await db
			.select({
				id: deviceClients.id,
				macAddress: deviceClients.macAddress,
				ipAddress: deviceClients.ipAddress,
				hostname: deviceClients.hostname,
				siteId: deviceClients.siteId,
				siteName: sites.name,
				deviceId: deviceClients.deviceId,
				deviceName: devices.name,
				interfaceName: deviceClients.interfaceName,
				isWireless: deviceClients.isWireless,
				lastSeenAt: deviceClients.lastSeenAt
			})
			.from(deviceClients)
			.leftJoin(sites, eq(deviceClients.siteId, sites.id))
			.leftJoin(devices, eq(deviceClients.deviceId, devices.id))
			.where(
				or(
					ilike(deviceClients.macAddress, `%${q}%`),
					ilike(deviceClients.ipAddress, `%${q}%`),
					ilike(deviceClients.hostname, `%${q}%`)
				)
			)
			.orderBy(deviceClients.lastSeenAt)
			.limit(50);
	}

	return { sites: siteRows, q, clientResults };
}
