import {RouterOSClient, type RouterOSInterface} from '@sourceregistry/mikrotik-client/routeros';
import {
	SwitchOSClient,
	decodeSwitchOSHexString
} from '@sourceregistry/mikrotik-client/switchos';
import {Service} from '@sourceregistry/sveltekit-service-manager';
import {createAdoptionAttempt, updateAdoptionAttempt} from '$lib/server/repositories/adoption.repository';
import {recordAuditEvent} from '$lib/server/repositories/audit.repository';
import {replaceDeviceInterfaces, replaceReadOnlyCredential, upsertAdoptedDevice} from '$lib/server/repositories/device.repository';
import {updateJob} from '$lib/server/repositories/job.repository';
import {ensureSiteByName} from '$lib/server/repositories/site.repository';
import {encryptSecret} from '$lib/server/security/secrets';

export type DevicePlatform = 'routeros' | 'switchos';
export type AdoptionMode = 'read_only' | 'managed';

export type AdoptDeviceInput = {
	host: string;
	username: string;
	password: string;
	siteName: string;
	apiPort: number;
	platform: DevicePlatform;
	requestedByUserId: string;
};

export type RouterOSInventory = {
	identity: string;
	version?: string;
	model?: string;
	serialNumber?: string;
	architecture?: string;
	uptimeSeconds?: number;
	interfaces: RouterOSInterface[];
};

type SwitchOSSystemResponse = {
	id?: string;
	ver?: string;
	version?: string;
	board?: string;
	model?: string;
	dev?: string;
	sn?: string;
	serial?: string;
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

async function readRouterOsInventory(input: AdoptDeviceInput): Promise<RouterOSInventory> {
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
			client.system.identity.get({timeoutMs: 8_000}),
			client.system.resource.get({timeoutMs: 8_000}),
			client.system.routerboard.get({timeoutMs: 8_000}).catch(() => undefined),
			client.interface.list({timeoutMs: 8_000})
		]);

		return {
			identity: identity?.name ?? input.host,
			version: resource?.version,
			model: routerboard?.model ?? resource?.['board-name'],
			serialNumber: undefined,
			architecture: undefined,
			uptimeSeconds: parseRouterOsUptimeSeconds(resource?.uptime),
			interfaces
		};
	} finally {
		await client.close();
	}
}

async function readSwitchOsInventory(input: AdoptDeviceInput): Promise<RouterOSInventory> {
	const client = new SwitchOSClient({
		baseUrl: `http://${input.host}:${input.apiPort}`,
		username: input.username,
		password: input.password,
		timeoutMs: 8_000
	});

	const system = await client.read<SwitchOSSystemResponse>('/sys.b');
	const identity = system.id ? decodeSwitchOSHexString(system.id) : input.host;

	return {
		identity,
		version: system.ver ?? system.version,
		model: system.board ?? system.model ?? system.dev,
		serialNumber: system.sn ?? system.serial,
		architecture: 'switchos',
		interfaces: []
	};
}

export async function readAdoptionInventory(input: AdoptDeviceInput): Promise<RouterOSInventory> {
	const inventory = input.platform === 'switchos'
		? await readSwitchOsInventory(input)
		: await readRouterOsInventory(input);

	if (input.platform === 'routeros') {
		const majorVersion = parseRouterOsMajorVersion(inventory.version);
		if (majorVersion !== undefined && majorVersion < 7) {
			throw new Error(`RouterOS ${inventory.version} is not supported. Minimum supported version is v7.`);
		}
	}

	return inventory;
}

export async function createCredentialAdoptionAttempt(input: AdoptDeviceInput, mode: AdoptionMode = 'read_only') {
	const site = await ensureSiteByName(input.siteName || 'Default');
	const attempt = await createAdoptionAttempt({
		siteId: site.id,
		requestedByUserId: input.requestedByUserId,
		status: 'validating_credentials',
		mode,
		host: input.host,
		username: input.username,
		startedAt: new Date(),
		progress: {
			steps: ['created', 'validating_credentials']
		}
	});

	return {site, attempt};
}

export async function syncCredentialAdoptionInventory(input: {
	adoption: AdoptDeviceInput;
	attemptId: string;
	siteId: string;
	inventory: RouterOSInventory;
	jobId?: string;
}) {
	const now = new Date();

	await updateAdoptionAttempt(input.attemptId, {
		status: 'syncing_inventory',
		progress: {
			steps: ['created', 'validating_credentials', 'syncing_inventory']
		}
	});

	const device = await upsertAdoptedDevice({
		siteId: input.siteId,
		name: input.inventory.identity,
		platform: input.adoption.platform,
		adoptionMode: 'read_only',
		adoptionState: 'inventoried',
		connectionStatus: 'online',
		host: input.adoption.host,
		apiPort: input.adoption.apiPort,
		identity: input.inventory.identity,
		model: input.inventory.model,
		serialNumber: input.inventory.serialNumber,
		routerOsVersion: input.inventory.version,
		architecture: input.inventory.architecture,
		uptimeSeconds: input.inventory.uptimeSeconds,
		capabilities: [
			input.adoption.platform === 'switchos' ? 'switchos-http' : 'routeros-api'
		],
		tags: [],
		lastSeenAt: now,
		lastSyncAt: now
	});

	await replaceDeviceInterfaces(
		device.id,
		input.inventory.interfaces
			.filter((networkInterface) => networkInterface.name)
			.map((networkInterface) => ({
				routerosId: networkInterface['.id'],
				name: networkInterface.name ?? 'unknown',
				type: networkInterface.type,
				macAddress: networkInterface['mac-address'],
				comment: undefined,
				running: networkInterface.running === true,
				disabled: networkInterface.disabled === true
			}))
	);

	if (input.jobId) {
		await updateJob(input.jobId, {deviceId: device.id});
	}

	Service('devices').event.emit('device.updated', {
		siteId: device.siteId,
		deviceId: device.id,
		reason: 'interfaces',
		connectionStatus: device.connectionStatus,
		timestamp: new Date().toISOString()
	});

	return device;
}

export async function storeAdoptionReadOnlyCredential(input: AdoptDeviceInput, deviceId: string): Promise<void> {
	await replaceReadOnlyCredential({
		deviceId,
		username: input.username,
		secretEncrypted: encryptSecret(input.password)
	});
}

export async function finishCredentialAdoption(input: AdoptDeviceInput, context: {
	attemptId: string;
	device: Awaited<ReturnType<typeof syncCredentialAdoptionInventory>>;
	site: Awaited<ReturnType<typeof ensureSiteByName>>;
	inventory: RouterOSInventory;
	mode?: AdoptionMode;
}): Promise<void> {
	const mode = context.mode ?? 'read_only';

	await updateAdoptionAttempt(context.attemptId, {
		deviceId: context.device.id,
		status: 'succeeded',
		finishedAt: new Date(),
		progress: {
			steps: ['created', 'validating_credentials', 'syncing_inventory', 'succeeded'],
			interfaceCount: context.inventory.interfaces.length
		}
	});

	Service('devices').event.emit('device.adopted', {
		host: context.device.host,
		deviceId: context.device.id,
		siteId: context.site.id,
		siteName: context.site.name,
		identity: context.device.identity ?? context.inventory.identity,
		platform: context.device.platform,
		timestamp: new Date().toISOString()
	});

	await recordAuditEvent({
		actorUserId: input.requestedByUserId,
		targetDeviceId: context.device.id,
		action: mode === 'managed' ? 'device.adopted.managed' : 'device.adopted.read_only',
		message: `${context.inventory.identity} adopted in ${mode === 'managed' ? 'managed' : 'read-only'} mode`,
		metadata: {
			host: input.host,
			site: context.site.name,
			routerOsVersion: context.inventory.version
		}
	});
}

export async function failCredentialAdoption(input: AdoptDeviceInput, attemptId: string, error: unknown): Promise<void> {
	await updateAdoptionAttempt(attemptId, {
		status: 'failed',
		errorMessage: error instanceof Error ? error.message : 'Unknown adoption error.',
		finishedAt: new Date(),
		progress: {
			steps: ['created', 'validating_credentials', 'failed']
		}
	});

	await recordAuditEvent({
		actorUserId: input.requestedByUserId,
		action: 'device.adoption.failed',
		message: `Failed to adopt ${input.host}`,
		metadata: {
			host: input.host,
			error: error instanceof Error ? error.message : 'Unknown adoption error.'
		}
	});
}
