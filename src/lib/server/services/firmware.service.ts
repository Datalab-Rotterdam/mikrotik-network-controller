import { RouterOSClient, RouterOSSshClient } from '@sourceregistry/mikrotik-client/routeros';
import { getDeviceById, getDeviceCredentials } from '$lib/server/repositories/telemetry.repository';
import { decryptSecret } from '$lib/server/security/secrets';
import { getControllerSshPrivateKeyPath } from '$lib/server/security/controller-ssh-keys';
import { upsertFirmwareVersion, getFirmwareVersion } from '$lib/server/repositories/firmware.repository';
import type { TaskDefinition } from '$lib/server/services/scheduler.service/types';

const CLIENT_TIMEOUT_MS = 15_000;

type UpdateCheckResult = {
	currentVersion: string | null;
	latestVersion: string | null;
	channel: 'stable' | 'testing' | 'long-term';
	updateAvailable: boolean;
};

export async function checkFirmwareUpdate(deviceId: string): Promise<UpdateCheckResult> {
	const device = await getDeviceById(deviceId);
	if (!device) throw new Error(`Device ${deviceId} not found`);

	const credentials = await getDeviceCredentials(deviceId);
	const cred =
		credentials.find((c) => c.purpose === 'read_only') ??
		credentials.find((c) => c.purpose === 'write');
	if (!cred) throw new Error('No credential available for firmware check');

	const client = new RouterOSClient({
		host: device.host,
		port: device.apiPort,
		username: cred.username,
		password: decryptSecret(cred.secretEncrypted),
		timeoutMs: CLIENT_TIMEOUT_MS
	});

	try {
		await client.login();

		// Trigger update check — RouterOS queries MikroTik servers
		await client.execute('/system/package/update/check-for-updates', {}).catch(() => {});

		// Small delay for RouterOS to complete the check
		await new Promise((r) => setTimeout(r, 3000));

		const [updateInfo] = await client.print('/system/package/update', {}) as Array<Record<string, string>>;

		const currentVersion = device.routerOsVersion ?? updateInfo?.['installed-version'] ?? null;
		const latestVersion = updateInfo?.['latest-version'] ?? null;
		const channelRaw = updateInfo?.['channel'] ?? 'stable';
		const channel: UpdateCheckResult['channel'] =
			channelRaw === 'testing' ? 'testing' :
			channelRaw === 'long-term' ? 'long-term' :
			'stable';

		const statusStr = (updateInfo?.status ?? '').toLowerCase();
		const updateAvailable =
			Boolean(latestVersion) &&
			Boolean(currentVersion) &&
			latestVersion !== currentVersion &&
			(statusStr.includes('new') || statusStr.includes('available') || latestVersion !== currentVersion);

		await upsertFirmwareVersion({ deviceId, currentVersion, latestVersion, channel, updateAvailable });

		return { currentVersion, latestVersion, channel, updateAvailable };
	} finally {
		await client.close().catch(() => {});
	}
}

export function createFirmwareCheckTask(
	deviceId: string,
	siteId?: string
): TaskDefinition<{ deviceId: string }> {
	return {
		name: 'devices.firmware.check',
		deviceId,
		siteId: siteId ?? null,
		payload: { deviceId },
		failurePolicy: 'stop',
		steps: [
			{
				name: 'Check for RouterOS firmware update',
				async execute() {
					const result = await checkFirmwareUpdate(deviceId);
					return {
						message: result.updateAvailable
							? `Update available: ${result.currentVersion} → ${result.latestVersion}`
							: `Up to date (${result.currentVersion})`,
						data: result
					};
				}
			}
		]
	};
}

export function createFirmwareUpgradeTask(
	deviceId: string,
	siteId?: string
): TaskDefinition<{ deviceId: string }> {
	return {
		name: 'devices.firmware.upgrade',
		deviceId,
		siteId: siteId ?? null,
		payload: { deviceId },
		failurePolicy: 'stop',
		steps: [
			{
				name: 'Verify update available',
				async execute() {
					const fw = await getFirmwareVersion(deviceId);
					if (!fw?.updateAvailable) {
						throw new Error('No firmware update available — run a firmware check first');
					}
					return {
						message: `Upgrading from ${fw.currentVersion} to ${fw.latestVersion}`,
						data: { from: fw.currentVersion, to: fw.latestVersion }
					};
				}
			},
			{
				name: 'Download firmware package',
				async execute() {
					const device = await getDeviceById(deviceId);
					if (!device) throw new Error(`Device ${deviceId} not found`);

					const credentials = await getDeviceCredentials(deviceId);
					const managedCred = credentials.find((c) => c.purpose === 'write');
					if (!managedCred) throw new Error('SSH trust credential required for firmware upgrade');

					const privateKeyPath = await getControllerSshPrivateKeyPath();
					const ssh = new RouterOSSshClient({
						host: device.host,
						username: managedCred.username,
						identityFile: privateKeyPath,
						port: device.sshPort,
						timeoutMs: 120_000
					});

					await ssh.execute('/system/package/update/install', { timeoutMs: 120_000 });

					return { message: 'Firmware download initiated — device will reboot' };
				}
			},
			{
				name: 'Wait for device to come back online',
				async execute() {
					// RouterOS reboots after install; wait up to 3 min for it to return
					const device = await getDeviceById(deviceId);
					if (!device) throw new Error(`Device ${deviceId} not found`);

					const credentials = await getDeviceCredentials(deviceId);
					const cred =
						credentials.find((c) => c.purpose === 'read_only') ??
						credentials.find((c) => c.purpose === 'write');
					if (!cred) throw new Error('No credential available');

					const deadline = Date.now() + 3 * 60 * 1_000;
					let lastErr: unknown;

					while (Date.now() < deadline) {
						await new Promise((r) => setTimeout(r, 10_000));
						const client = new RouterOSClient({
							host: device.host,
							port: device.apiPort,
							username: cred.username,
							password: decryptSecret(cred.secretEncrypted),
							timeoutMs: 8_000
						});
						try {
							await client.login();
							const [res] = await client.print('/system/resource', {}) as Array<Record<string, string>>;
							await client.close().catch(() => {});
							const newVersion = res?.version ?? null;
							await upsertFirmwareVersion({
								deviceId,
								currentVersion: newVersion,
								latestVersion: newVersion,
								channel: 'stable',
								updateAvailable: false
							});
							return { message: `Device back online — RouterOS ${newVersion}`, data: { version: newVersion } };
						} catch (err) {
							lastErr = err;
							await client.close().catch(() => {});
						}
					}

					throw new Error(`Device did not come back online within 3 minutes: ${lastErr}`);
				}
			}
		]
	};
}
