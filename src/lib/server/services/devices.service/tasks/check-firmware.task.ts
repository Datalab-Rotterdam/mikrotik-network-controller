import {FirmwareRepository} from "$lib/server/repositories/firmware.repository";
import {TelemetryRepository} from "$lib/server/repositories/telemetry.repository";
import {decryptSecret} from "$lib/server/security/secrets";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";
import {RouterOSClient} from "@sourceregistry/mikrotik-client/routeros";

const CLIENT_TIMEOUT_MS = 15_000;

type UpdateCheckResult = {
    currentVersion: string | null;
    latestVersion: string | null;
    channel: 'stable' | 'testing' | 'long-term';
    updateAvailable: boolean;
};


async function checkFirmwareUpdate(deviceId: string): Promise<UpdateCheckResult> {
    const device = await TelemetryRepository.getDeviceById(deviceId);
    if (!device) throw new Error(`Device ${deviceId} not found`);

    const credentials = await TelemetryRepository.getCredentials(deviceId);
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

        await FirmwareRepository.upsertVersion({ deviceId, currentVersion, latestVersion, channel, updateAvailable });

        return { currentVersion, latestVersion, channel, updateAvailable };
    } finally {
        await client.close().catch(() => {});
    }
}

export default (
    deviceId: string,
    siteId?: string
): TaskDefinition<{ deviceId: string }> => {
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
