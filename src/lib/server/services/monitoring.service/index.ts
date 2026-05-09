import {RouterOSClient} from '@sourceregistry/mikrotik-client/routeros';
import type {Service} from '@sourceregistry/sveltekit-service-manager';
import {Service as ResolveService} from '@sourceregistry/sveltekit-service-manager';
import {ServiceManager} from '@sourceregistry/sveltekit-service-manager/server';
import {OpenEventEmitter, type OpenListener} from '$lib/server/helpers/OpenEventEmitter';
import {getDeviceById, getDeviceCredentials, listDevices} from '$lib/server/repositories/telemetry.repository';
import {updateDeviceTelemetryState} from '$lib/server/repositories/device.repository';
import {decryptSecret} from '$lib/server/security/secrets';
import {
	insertDeviceMetric,
	insertInterfaceMetrics,
	pruneOldMetrics
} from '$lib/server/repositories/metrics.repository';
import {
	markDeviceClientsInactive,
	upsertDeviceClients,
	type DeviceClientInput
} from '$lib/server/repositories/clients.repository';
import {
	evaluateDeviceMetric,
	evaluateDeviceOffline,
	evaluateDeviceOnline
} from '$lib/server/services/alert-evaluator.service';
import {upsertTopologyLinks} from '$lib/server/repositories/topology.repository';
import {createBackupDeviceTask} from '$lib/server/services/devices.service/modules/provisioning/tasks';
import {createFirmwareCheckTask} from '$lib/server/services/firmware.service';
import type {DeviceEventMap, DeviceUpdatedPayload} from '$lib/server/services/devices.service/modules/event.module';

export type MonitoringEventMap = {
	'metric:updated': [{deviceId: string; siteId: string | null; collectedAt: Date}];
	'client:updated': [{siteId: string | null}];
	'topology:updated': [{siteId: string | null}];
};

export const monitoringEvents = new OpenEventEmitter<MonitoringEventMap>();

const POLL_INTERVAL_MS = 30_000;
const STARTUP_DELAY_MS = 8_000;
const CLIENT_TIMEOUT_MS = 10_000;
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1_000;

type MonitorableDevice = {
	id: string;
	siteId: string | null;
	host: string;
	apiPort: number;
	capabilities: string[];
	adoptionState: string;
	adoptionMode: string;
	connectionStatus: string;
	platform: string;
};

type RawRecord = Record<string, unknown>;

type DeviceMonitorEntry = {
	device: MonitorableDevice;
	timer: NodeJS.Timeout;
	inFlight: Promise<void> | null;
};

const monitors = new Map<string, DeviceMonitorEntry>();
let pollStartupTimer: NodeJS.Timeout | null = null;
let pruneTimer: NodeJS.Timeout | null = null;
let backupTimer: NodeJS.Timeout | null = null;
let firmwareTimer: NodeJS.Timeout | null = null;
let started = false;

function parseUptimeSeconds(value: unknown): number {
	if (typeof value !== 'string') return 0;
	let total = 0;
	for (const [, n, unit] of value.matchAll(/(\d+)([wdhms])/g)) {
		const v = Number(n);
		if (unit === 'w') total += v * 604_800;
		else if (unit === 'd') total += v * 86_400;
		else if (unit === 'h') total += v * 3_600;
		else if (unit === 'm') total += v * 60;
		else if (unit === 's') total += v;
	}
	return total;
}

function num(value: unknown): number | null {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

function isMonitorable(device: Pick<MonitorableDevice, 'adoptionState'>): boolean {
	return device.adoptionState !== 'discovered' && device.adoptionState !== 'failed';
}

function stopMonitor(deviceId: string): void {
	const entry = monitors.get(deviceId);
	if (!entry) {
		return;
	}

	clearInterval(entry.timer);
	monitors.delete(deviceId);
}

async function collectDevice(device: MonitorableDevice): Promise<void> {
	const credentials = await getDeviceCredentials(device.id);
	const cred = credentials.find((c) => c.purpose === 'read_only');
	if (!cred) return;

	const client = new RouterOSClient({
		host: device.host,
		port: device.apiPort,
		username: cred.username,
		password: decryptSecret(cred.secretEncrypted),
		timeoutMs: CLIENT_TIMEOUT_MS
	});

	const hasCapsMan =
		device.capabilities.includes('cap') || device.capabilities.includes('caps-man');

	try {
		const now = new Date();
		const [resourceResult, ifaceResult, healthResult, arpResult, dhcpResult, capsmanResult, neighborResult] =
			await Promise.allSettled([
				client.system.resource.get() as Promise<RawRecord>,
				client.print('/interface', {}) as Promise<RawRecord[]>,
				client.print('/system/health', {}) as Promise<RawRecord[]>,
				client.print('/ip/arp', {}) as Promise<RawRecord[]>,
				client.print('/ip/dhcp-server/lease', {}) as Promise<RawRecord[]>,
				hasCapsMan
					? (client.print('/caps-man/registration-table', {}) as Promise<RawRecord[]>)
					: Promise.resolve([] as RawRecord[]),
				client.print('/ip/neighbor', {}) as Promise<RawRecord[]>
			]);

		if (resourceResult.status === 'fulfilled') {
			const res = resourceResult.value;
			const uptime = parseUptimeSeconds(res['uptime'] ?? res.uptime);

			let temperatureCelsius: number | null = null;
			if (healthResult.status === 'fulfilled') {
				for (const entry of healthResult.value) {
					const name = str(entry['name'] ?? entry.name)?.toLowerCase();
					if (name === 'temperature' || 'temperature' in entry) {
						temperatureCelsius = num(
							entry['temperature'] ?? entry['value'] ?? entry.temperature
						);
						break;
					}
				}
			}

			await insertDeviceMetric({
				deviceId: device.id,
				cpuPercent: num(res['cpu-load'] ?? res.cpuLoad),
				freeMemoryBytes: num(res['free-memory'] ?? res.freeMemory),
				totalMemoryBytes: num(res['total-memory'] ?? res.totalMemory),
				temperatureCelsius,
				uptimeSeconds: uptime || null
			});

			await updateDeviceTelemetryState(device.id, 'online', uptime || undefined);
			ResolveService('devices').event.emit('device.updated', {
				siteId: device.siteId,
				deviceId: device.id,
				reason: 'telemetry',
				connectionStatus: 'online',
				timestamp: now.toISOString()
			});
			monitoringEvents.emit('metric:updated', {
				deviceId: device.id,
				siteId: device.siteId,
				collectedAt: now
			});

			if (device.siteId) {
				void evaluateDeviceOnline(device.id, device.siteId).catch(() => {});
				void evaluateDeviceMetric({
					deviceId: device.id,
					siteId: device.siteId,
					cpuPercent: num(res['cpu-load'] ?? res.cpuLoad),
					freeMemoryBytes: num(res['free-memory'] ?? res.freeMemory),
					totalMemoryBytes: num(res['total-memory'] ?? res.totalMemory),
					temperatureCelsius,
					uptimeSeconds: uptime || null
				}).catch(() => {});
			}
		}

		if (ifaceResult.status === 'fulfilled') {
			const rows = ifaceResult.value
				.filter((iface) => str(iface['name'] ?? iface.name))
				.map((iface) => ({
					deviceId: device.id,
					interfaceName: str(iface['name'] ?? iface.name) as string,
					rxBytes: num(iface['rx-byte'] ?? iface.rxByte),
					txBytes: num(iface['tx-byte'] ?? iface.txByte),
					rxErrors: num(iface['rx-error'] ?? iface.rxError),
					txErrors: num(iface['tx-error'] ?? iface.txError),
					rxDrops: num(iface['rx-drop'] ?? iface.rxDrop),
					txDrops: num(iface['tx-drop'] ?? iface.txDrop),
					running: iface['running'] === 'true' || iface['running'] === true
				}));
			await insertInterfaceMetrics(rows);
		}

		const clientMap = new Map<string, DeviceClientInput>();

		if (arpResult.status === 'fulfilled') {
			for (const entry of arpResult.value) {
				const mac = str(entry['mac-address'] ?? entry.macAddress);
				if (!mac) continue;
				clientMap.set(mac, {
					deviceId: device.id,
					siteId: device.siteId,
					macAddress: mac,
					ipAddress: str(entry['address'] ?? entry.address),
					hostname: null,
					interfaceName: str(entry['interface'] ?? entry.interface),
					isWireless: false,
					ssid: null,
					signalStrength: null
				});
			}
		}

		if (dhcpResult.status === 'fulfilled') {
			for (const lease of dhcpResult.value) {
				if (str(lease['status'] ?? lease.status) !== 'bound') continue;
				const mac = str(lease['mac-address'] ?? lease.macAddress);
				if (!mac) continue;
				const prev = clientMap.get(mac);
				clientMap.set(mac, {
					deviceId: device.id,
					siteId: device.siteId,
					macAddress: mac,
					ipAddress: str(lease['address'] ?? lease.address) ?? prev?.ipAddress ?? null,
					hostname:
						str(lease['host-name'] ?? lease.hostName ?? lease.hostname) ??
						prev?.hostname ??
						null,
					interfaceName:
						str(lease['interface'] ?? lease.interface) ?? prev?.interfaceName ?? null,
					isWireless: prev?.isWireless ?? false,
					ssid: prev?.ssid ?? null,
					signalStrength: prev?.signalStrength ?? null
				});
			}
		}

		if (capsmanResult.status === 'fulfilled') {
			for (const reg of capsmanResult.value) {
				const mac = str(reg['mac-address'] ?? reg.macAddress);
				if (!mac) continue;
				const rawSignal = str(reg['signal-strength'] ?? reg.signalStrength) ?? '';
				const signal = num(rawSignal.replace(/[^0-9-]/g, ''));
				const prev = clientMap.get(mac);
				clientMap.set(mac, {
					...(prev ?? {deviceId: device.id, siteId: device.siteId, macAddress: mac}),
					isWireless: true,
					ssid: str(reg['ssid'] ?? reg.ssid) ?? prev?.ssid ?? null,
					signalStrength: signal,
					interfaceName:
						str(reg['interface'] ?? reg.interface) ?? prev?.interfaceName ?? null
				});
			}
		}

		await markDeviceClientsInactive(device.id);
		await upsertDeviceClients([...clientMap.values()]);
		monitoringEvents.emit('client:updated', {siteId: device.siteId});

		if (neighborResult.status === 'fulfilled' && neighborResult.value.length > 0) {
			const links = neighborResult.value
				.filter((n) => str(n['address'] ?? n.address))
				.map((n) => ({
					siteId: device.siteId,
					sourceDeviceId: device.id,
					sourceInterface: str(n['interface'] ?? n.interface),
					targetDeviceId: null as string | null,
					targetHost: str(n['address'] ?? n.address) as string,
					targetInterface: str(n['interface-name'] ?? n.interfaceName),
					targetIdentity: str(n['identity'] ?? n.identity),
					discoveredVia: 'neighbor' as const
				}));
			void upsertTopologyLinks(links).catch(() => {});
			monitoringEvents.emit('topology:updated', {siteId: device.siteId});
		}
	} catch {
		await updateDeviceTelemetryState(device.id, 'offline');
		ResolveService('devices').event.emit('device.updated', {
			siteId: device.siteId,
			deviceId: device.id,
			reason: 'telemetry',
			connectionStatus: 'offline',
			timestamp: new Date().toISOString()
		});
		if (device.siteId) {
			void evaluateDeviceOffline(device.id, device.siteId).catch(() => {});
		}
	} finally {
		await client.close().catch(() => {
			/* ignore close errors */
		});
	}
}

function triggerMonitor(deviceId: string): void {
	const entry = monitors.get(deviceId);
	if (!entry || entry.inFlight) {
		return;
	}

	entry.inFlight = collectDevice(entry.device).finally(() => {
		const current = monitors.get(deviceId);
		if (current) {
			current.inFlight = null;
		}
	});
}

function startMonitor(device: MonitorableDevice): void {
	stopMonitor(device.id);

	const timer = setInterval(() => {
		triggerMonitor(device.id);
	}, POLL_INTERVAL_MS);

	monitors.set(device.id, {
		device,
		timer,
		inFlight: null
	});

	triggerMonitor(device.id);
}

function upsertMonitor(device: MonitorableDevice): void {
	if (!isMonitorable(device)) {
		stopMonitor(device.id);
		return;
	}

	const existing = monitors.get(device.id);
	if (!existing) {
		startMonitor(device);
		return;
	}

	existing.device = device;
}

async function syncMonitor(deviceId: string): Promise<void> {
	const device = await getDeviceById(deviceId);
	if (!device) {
		stopMonitor(deviceId);
		return;
	}

	upsertMonitor(device);
}

async function syncMonitors(): Promise<void> {
	try {
		const devices = await listDevices();
		const seen = new Set<string>();

		for (const device of devices) {
			seen.add(device.id);
			upsertMonitor(device);
		}

		for (const deviceId of monitors.keys()) {
			if (!seen.has(deviceId)) {
				stopMonitor(deviceId);
			}
		}
	} catch {
		/* ignore */
	}
}

async function updateAllMonitors(): Promise<void> {
	await Promise.allSettled([...monitors.keys()].map(async (deviceId) => triggerMonitor(deviceId)));
}

async function backupAllDevices(): Promise<void> {
	try {
		const devices = await listDevices();
		const managed = devices.filter(
			(d) => d.adoptionMode === 'managed' && d.adoptionState === 'fully_managed'
		);
		for (const d of managed) {
			void ResolveService('scheduler')
				.schedule(createBackupDeviceTask(d.id, d.siteId ?? undefined))
				.catch(() => {});
		}
	} catch {
		/* ignore */
	}
}

async function checkAllFirmware(): Promise<void> {
	try {
		const devices = await listDevices();
		const routeros = devices.filter((d) => d.platform === 'routeros' && d.connectionStatus === 'online');
		for (const d of routeros) {
			void ResolveService('scheduler')
				.schedule(createFirmwareCheckTask(d.id, d.siteId ?? undefined))
				.catch(() => {});
		}
	} catch {
		/* ignore */
	}
}

const handleDeviceEvent: OpenListener<DeviceEventMap> = (eventName, ...args) => {
	switch (eventName) {
		case 'device.adopted': {
			const payload = args[0];
			if (payload.deviceId) {
				void syncMonitor(payload.deviceId).catch(() => {
					/* ignore */
				});
			}
			return;
		}
		case 'device.updated': {
			const payload = args[0] as DeviceUpdatedPayload;
			if (payload.reason === 'telemetry') {
				return;
			}
			void syncMonitor(payload.deviceId).catch(() => {
				/* ignore */
			});
			return;
		}
		case 'device.removed': {
			const payload = args[0];
			stopMonitor(payload.deviceId);
			return;
		}
	}
};

function stopMonitoring(): void {
	if (pollStartupTimer) {
		clearTimeout(pollStartupTimer);
		pollStartupTimer = null;
	}
	if (pruneTimer) {
		clearInterval(pruneTimer);
		pruneTimer = null;
	}
	if (backupTimer) {
		clearInterval(backupTimer);
		backupTimer = null;
	}
	if (firmwareTimer) {
		clearInterval(firmwareTimer);
		firmwareTimer = null;
	}

	for (const deviceId of [...monitors.keys()]) {
		stopMonitor(deviceId);
	}

	ResolveService('devices').event.removeAny(handleDeviceEvent);
	started = false;
}

export function startMonitoring(): void {
	if (started) return;
	started = true;

	ResolveService('devices').event.any(handleDeviceEvent);

	pollStartupTimer = setTimeout(() => {
		void syncMonitors();

		void pruneOldMetrics(30);
		pruneTimer = setInterval(() => void pruneOldMetrics(30), DAILY_INTERVAL_MS);

		void backupAllDevices();
		backupTimer = setInterval(() => void backupAllDevices(), DAILY_INTERVAL_MS);

		void checkAllFirmware();
		firmwareTimer = setInterval(() => void checkAllFirmware(), DAILY_INTERVAL_MS);
	}, STARTUP_DELAY_MS);
}

export const service = {
	name: 'monitoring',
	local: {
		start: startMonitoring,
		syncMonitors,
		updateAllMonitors
	},
	cleanup: stopMonitoring
} satisfies Service<'monitoring'>;

export type MonitoringService = typeof service;

export default ServiceManager.Load(service, import.meta);
