import { RouterOSClient } from '@sourceregistry/mikrotik-client/routeros';
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { decryptSecret } from '$lib/server/security/secrets';
import { MetricsRepository } from '$lib/server/repositories/metrics.repository';
import { ClientRepository, type DeviceClientInput } from '$lib/server/repositories/clients.repository';
import { emitDeviceUpdated } from '$lib/server/services/device-events.service';
import { monitoringEvents } from '$lib/server/services/monitoring-events.service';
import {
	evaluateDeviceMetric,
	evaluateDeviceOffline,
	evaluateDeviceOnline
} from '$lib/server/services/alert-evaluator.service';
import { TopologyRepository } from '$lib/server/repositories/topology.repository';
import { FirewallRepository } from '$lib/server/repositories/firewall.repository';
import { VlanRepository } from '$lib/server/repositories/vlan.repository';
import { createBackupDeviceTask } from '$lib/server/services/devices.service/tasks';
import { createFirmwareCheckTask } from '$lib/server/services/firmware.service';
import { Service } from '@sourceregistry/sveltekit-service-manager';

const POLL_INTERVAL_MS = 30_000;
const STARTUP_DELAY_MS = 8_000;
const CLIENT_TIMEOUT_MS = 10_000;

type MonitorableDevice = {
	id: string;
	siteId: string | null;
	host: string;
	apiPort: number;
	capabilities: string[];
};

type RawRecord = Record<string, unknown>;

/** Parse RouterOS uptime string (e.g. "1w2d3h4m5s") into total seconds. */
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

async function collectDevice(device: MonitorableDevice): Promise<void> {
	const credentials = await TelemetryRepository.getCredentials(device.id);
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

		const [resourceResult, ifaceResult, healthResult, arpResult, dhcpResult, capsmAnResult, neighborResult, firewallResult, vlanResult] =
			await Promise.allSettled([
				client.system.resource.get() as Promise<RawRecord>,
				client.print('/interface', {}) as Promise<RawRecord[]>,
				client.print('/system/health', {}) as Promise<RawRecord[]>,
				client.print('/ip/arp', {}) as Promise<RawRecord[]>,
				client.print('/ip/dhcp-server/lease', {}) as Promise<RawRecord[]>,
				hasCapsMan
					? (client.print('/caps-man/registration-table', {}) as Promise<RawRecord[]>)
					: Promise.resolve([] as RawRecord[]),
				client.print('/ip/neighbor', {}) as Promise<RawRecord[]>,
				client.print('/ip/firewall/filter', {}) as Promise<RawRecord[]>,
				client.print('/interface/vlan', {}) as Promise<RawRecord[]>
			]);

		// --- System metrics ---
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

			await MetricsRepository.insertDeviceMetric({
				deviceId: device.id,
				cpuPercent: num(res['cpu-load'] ?? res.cpuLoad),
				freeMemoryBytes: num(res['free-memory'] ?? res.freeMemory),
				totalMemoryBytes: num(res['total-memory'] ?? res.totalMemory),
				temperatureCelsius,
				uptimeSeconds: uptime || null
			});

			await DeviceRepository.updateTelemetryState(device.id, 'online', uptime || undefined);
			await emitDeviceUpdated(device.id, 'telemetry');
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

		// --- Interface metrics ---
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
			await MetricsRepository.insertInterfaceMetrics(rows);
		}

		// --- Connected clients ---
		// Build a map: mac → client. DHCP hostname takes priority over ARP entry.
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

		if (capsmAnResult.status === 'fulfilled') {
			for (const reg of capsmAnResult.value) {
				const mac = str(reg['mac-address'] ?? reg.macAddress);
				if (!mac) continue;
				// Signal strength comes as e.g. "-65dBm@6GHz" — strip the unit
				const rawSignal = str(reg['signal-strength'] ?? reg.signalStrength) ?? '';
				const signal = num(rawSignal.replace(/[^0-9-]/g, ''));
				const prev = clientMap.get(mac);
				clientMap.set(mac, {
					...(prev ?? { deviceId: device.id, siteId: device.siteId, macAddress: mac }),
					isWireless: true,
					ssid: str(reg['ssid'] ?? reg.ssid) ?? prev?.ssid ?? null,
					signalStrength: signal,
					interfaceName:
						str(reg['interface'] ?? reg.interface) ?? prev?.interfaceName ?? null
				});
			}
		}

		await ClientRepository.markInactiveForDevice(device.id);
		await ClientRepository.upsertForDevice([...clientMap.values()]);
		monitoringEvents.emit('client:updated', { siteId: device.siteId });

		// --- Topology neighbors ---
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
			void TopologyRepository.upsertLinks(links).catch(() => {});
			monitoringEvents.emit('topology:updated', { siteId: device.siteId });
		}

		// --- Firewall filter rules ---
		const validChains = new Set(['input', 'forward', 'output']);
		const validActions = new Set(['accept', 'drop', 'reject', 'jump', 'return', 'passthrough', 'log']);
		if (firewallResult.status === 'fulfilled') {
			const seenRouterIds: string[] = [];
			for (let i = 0; i < firewallResult.value.length; i++) {
				const rule = firewallResult.value[i];
				const routerId = str(rule['.id'] ?? rule.id);
				const chain = str(rule['chain'] ?? rule.chain);
				const action = str(rule['action'] ?? rule.action);
				if (!routerId || !chain || !action) continue;
				if (!validChains.has(chain) || !validActions.has(action)) continue;
				seenRouterIds.push(routerId);
				void FirewallRepository.upsert({
					deviceId: device.id,
					siteId: device.siteId,
					chain: chain as 'input' | 'forward' | 'output',
					action: action as 'accept' | 'drop' | 'reject' | 'jump' | 'return' | 'passthrough' | 'log',
					srcAddress: str(rule['src-address'] ?? rule.srcAddress),
					dstAddress: str(rule['dst-address'] ?? rule.dstAddress),
					protocol: str(rule['protocol'] ?? rule.protocol),
					srcPort: str(rule['src-port'] ?? rule.srcPort),
					dstPort: str(rule['dst-port'] ?? rule.dstPort),
					inInterface: str(rule['in-interface'] ?? rule.inInterface),
					outInterface: str(rule['out-interface'] ?? rule.outInterface),
					comment: str(rule['comment'] ?? rule.comment),
					disabled: rule['disabled'] === 'true' || rule['disabled'] === true,
					position: i,
					routerId
				}).catch(() => {});
			}
			void FirewallRepository.deleteByDeviceExcluding(device.id, seenRouterIds).catch(() => {});
		}

		// --- VLANs ---
		if (vlanResult.status === 'fulfilled') {
			const seenRouterIds: string[] = [];
			for (const vlan of vlanResult.value) {
				const routerId = str(vlan['.id'] ?? vlan.id);
				const name = str(vlan['name'] ?? vlan.name);
				const vlanId = num(vlan['vlan-id'] ?? vlan.vlanId);
				if (!routerId || !name || vlanId === null) continue;
				seenRouterIds.push(routerId);
				void VlanRepository.upsert({
					deviceId: device.id,
					siteId: device.siteId,
					vlanId,
					name,
					interfaceName: str(vlan['interface'] ?? vlan.interface),
					comment: str(vlan['comment'] ?? vlan.comment),
					routerId
				}).catch(() => {});
			}
			void VlanRepository.deleteByDeviceExcluding(device.id, seenRouterIds).catch(() => {});
		}
	} catch {
		await DeviceRepository.updateTelemetryState(device.id, 'offline');
		await emitDeviceUpdated(device.id, 'telemetry');
		if (device.siteId) {
			void evaluateDeviceOffline(device.id, device.siteId).catch(() => {});
		}
	} finally {
		await client.close().catch(() => {
			/* ignore close errors */
		});
	}
}

async function pollAll(): Promise<void> {
	try {
		const devices = await TelemetryRepository.listDevices();
		const monitorable = devices.filter(
			(d): d is typeof d & MonitorableDevice =>
				d.adoptionState !== 'discovered' && d.adoptionState !== 'failed'
		);
		await Promise.allSettled(monitorable.map((d) => collectDevice(d)));
	} catch {
		/* individual device errors are already handled; ignore top-level failures */
	}
}

let started = false;

export function startMonitoring(): void {
	if (started) return;
	started = true;

	setTimeout(() => {
		void pollAll();
		setInterval(() => void pollAll(), POLL_INTERVAL_MS);

		// Prune metrics older than 30 days, once per day
		void MetricsRepository.pruneOld(30);
		setInterval(() => void MetricsRepository.pruneOld(30), 24 * 60 * 60 * 1_000);

		// Daily backup for all managed devices
		async function backupAllDevices() {
			try {
				const devices = await TelemetryRepository.listDevices();
				const managed = devices.filter(
					(d) => d.adoptionMode === 'managed' && d.adoptionState === 'fully_managed'
				);
				for (const d of managed) {
					void Service('scheduler')
						.schedule(createBackupDeviceTask(d.id, d.siteId ?? undefined))
						.catch(() => {});
				}
			} catch {
				/* ignore */
			}
		}
		void backupAllDevices();
		setInterval(() => void backupAllDevices(), 24 * 60 * 60 * 1_000);

		// Daily firmware check for all adopted RouterOS devices
		async function checkAllFirmware() {
			try {
				const devices = await TelemetryRepository.listDevices();
				const routeros = devices.filter((d) => d.platform === 'routeros' && d.connectionStatus === 'online');
				for (const d of routeros) {
					void Service('scheduler')
						.schedule(createFirmwareCheckTask(d.id, d.siteId ?? undefined))
						.catch(() => {});
				}
			} catch {
				/* ignore */
			}
		}
		void checkAllFirmware();
		setInterval(() => void checkAllFirmware(), 24 * 60 * 60 * 1_000);
	}, STARTUP_DELAY_MS);
}
