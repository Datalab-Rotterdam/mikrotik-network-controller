import { RouterOSClient, type RouterOSInterface } from '@sourceregistry/mikrotik-client/routeros';
import { createAdoptionAttempt, updateAdoptionAttempt } from '$lib/server/repositories/adoption.repository';
import { recordAuditEvent } from '$lib/server/repositories/audit.repository';
import {
	replaceDeviceInterfaces,
	replaceReadOnlyCredential,
	upsertAdoptedDevice
} from '$lib/server/repositories/device.repository';
import { ensureSiteByName } from '$lib/server/repositories/site.repository';
import { encryptSecret } from '$lib/server/security/secrets';

type AdoptionProvider = 'real' | 'mock';

export type AdoptDeviceInput = {
	host: string;
	username: string;
	password: string;
	siteName: string;
	apiPort: number;
	provider: AdoptionProvider;
	requestedByUserId: string;
};

type RouterOSInventory = {
	identity: string;
	version?: string;
	model?: string;
	serialNumber?: string;
	architecture?: string;
	uptimeSeconds?: number;
	interfaces: RouterOSInterface[];
};

function parseRouterOsMajorVersion(version: string | undefined): number | undefined {
	const match = version?.match(/^(\d+)\./);
	return match ? Number(match[1]) : undefined;
}

function parseRouterOsUptimeSeconds(uptime: string | undefined): number | undefined {
	if (!uptime) {
		return undefined;
	}

	const weeks = Number(uptime.match(/(\d+)w/)?.[1] ?? 0);
	const days = Number(uptime.match(/(\d+)d/)?.[1] ?? 0);
	const hours = Number(uptime.match(/(\d+)h/)?.[1] ?? 0);
	const minutes = Number(uptime.match(/(\d+)m/)?.[1] ?? 0);
	const seconds = Number(uptime.match(/(\d+)s/)?.[1] ?? 0);

	return (((weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 + seconds;
}

function toBoolean(value: string | undefined): boolean {
	return value === 'true' || value === 'yes';
}

async function readRealRouterOsInventory(input: AdoptDeviceInput): Promise<RouterOSInventory> {
	const client = new RouterOSClient({
		host: input.host,
		port: input.apiPort,
		username: input.username,
		password: input.password,
		timeoutMs: 8_000
	});

	try {
		await client.login();

		const [identity, resource, routerboard, interfaces] = await Promise.all([
			client.system.identity.get({ timeoutMs: 8_000 }),
			client.system.resource.get({ timeoutMs: 8_000 }),
			client.system.routerboard.get({ timeoutMs: 8_000 }).catch(() => undefined),
			client.interface.list({ timeoutMs: 8_000 })
		]);

		return {
			identity: identity?.name ?? input.host,
			version: resource?.version,
			model: routerboard?.model ?? resource?.['board-name'] ?? resource?.boardName,
			serialNumber: routerboard?.['serial-number'],
			architecture: resource?.architecture,
			uptimeSeconds: parseRouterOsUptimeSeconds(resource?.uptime),
			interfaces
		};
	} finally {
		await client.close();
	}
}

async function readMockRouterOsInventory(input: AdoptDeviceInput): Promise<RouterOSInventory> {
	return {
		identity: `mock-${input.host.replaceAll('.', '-')}`,
		version: '7.18.2',
		model: 'CHR',
		serialNumber: 'MOCK-CHR-0001',
		architecture: 'x86_64',
		uptimeSeconds: 86340,
		interfaces: [
			{
				'.id': '*1',
				name: 'ether1',
				type: 'ether',
				running: 'true',
				disabled: 'false',
				'mac-address': '02:00:00:00:00:01'
			},
			{
				'.id': '*2',
				name: 'ether2',
				type: 'ether',
				running: 'false',
				disabled: 'false',
				'mac-address': '02:00:00:00:00:02'
			}
		]
	};
}

async function readInventory(input: AdoptDeviceInput): Promise<RouterOSInventory> {
	if (input.provider === 'mock') {
		return readMockRouterOsInventory(input);
	}

	return readRealRouterOsInventory(input);
}

export async function adoptRouterOsDevice(input: AdoptDeviceInput) {
	const site = await ensureSiteByName(input.siteName || 'Default');
	const attempt = await createAdoptionAttempt({
		siteId: site.id,
		requestedByUserId: input.requestedByUserId,
		status: 'validating_credentials',
		mode: 'read_only',
		host: input.host,
		username: input.username,
		startedAt: new Date(),
		progress: {
			provider: input.provider,
			steps: ['created', 'validating_credentials']
		}
	});

	try {
		const inventory = await readInventory(input);
		const majorVersion = parseRouterOsMajorVersion(inventory.version);

		if (majorVersion !== undefined && majorVersion < 7) {
			throw new Error(`RouterOS ${inventory.version} is not supported. Minimum supported version is v7.`);
		}

		await updateAdoptionAttempt(attempt.id, {
			status: 'syncing_inventory',
			progress: {
				provider: input.provider,
				steps: ['created', 'validating_credentials', 'syncing_inventory']
			}
		});

		const now = new Date();
		const device = await upsertAdoptedDevice({
			siteId: site.id,
			name: inventory.identity,
			platform: 'routeros',
			adoptionMode: 'read_only',
			adoptionState: 'inventoried',
			connectionStatus: 'online',
			host: input.host,
			apiPort: input.apiPort,
			identity: inventory.identity,
			model: inventory.model,
			serialNumber: inventory.serialNumber,
			routerOsVersion: inventory.version,
			architecture: inventory.architecture,
			uptimeSeconds: inventory.uptimeSeconds,
			capabilities: ['routeros-api', input.provider === 'mock' ? 'mock' : 'real-device'],
			tags: [],
			lastSeenAt: now,
			lastSyncAt: now
		});

		await replaceDeviceInterfaces(
			device.id,
			inventory.interfaces
				.filter((networkInterface) => networkInterface.name)
				.map((networkInterface) => ({
					routerosId: networkInterface['.id'],
					name: networkInterface.name ?? 'unknown',
					type: networkInterface.type,
					macAddress: networkInterface['mac-address'] ?? networkInterface.macAddress,
					comment: networkInterface.comment,
					running: toBoolean(networkInterface.running),
					disabled: toBoolean(networkInterface.disabled)
				}))
		);

		await replaceReadOnlyCredential({
			deviceId: device.id,
			username: input.username,
			secretEncrypted: encryptSecret(input.password)
		});

		await updateAdoptionAttempt(attempt.id, {
			deviceId: device.id,
			status: 'succeeded',
			finishedAt: new Date(),
			progress: {
				provider: input.provider,
				steps: ['created', 'validating_credentials', 'syncing_inventory', 'succeeded'],
				interfaceCount: inventory.interfaces.length
			}
		});

		await recordAuditEvent({
			actorUserId: input.requestedByUserId,
			targetDeviceId: device.id,
			action: 'device.adopted.read_only',
			message: `${inventory.identity} adopted in read-only mode`,
			metadata: {
				host: input.host,
				site: site.name,
				provider: input.provider,
				routerOsVersion: inventory.version
			}
		});

		return { device, site };
	} catch (error) {
		await updateAdoptionAttempt(attempt.id, {
			status: 'failed',
			errorMessage: error instanceof Error ? error.message : 'Unknown adoption error.',
			finishedAt: new Date(),
			progress: {
				provider: input.provider,
				steps: ['created', 'validating_credentials', 'failed']
			}
		});

		await recordAuditEvent({
			actorUserId: input.requestedByUserId,
			action: 'device.adoption.failed',
			message: `Failed to adopt ${input.host}`,
			metadata: {
				host: input.host,
				provider: input.provider,
				error: error instanceof Error ? error.message : 'Unknown adoption error.'
			}
		});

		throw error;
	}
}
