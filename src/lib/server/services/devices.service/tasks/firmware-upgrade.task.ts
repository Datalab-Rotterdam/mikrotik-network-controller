import {FirmwareRepository} from "$lib/server/repositories/firmware.repository";
import {TelemetryRepository} from "$lib/server/repositories/telemetry.repository";
import {getControllerSshPrivateKeyPath} from "$lib/server/security/controller-ssh-keys";
import {decryptSecret} from "$lib/server/security/secrets";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";
import {RouterOSClient, RouterOSSshClient} from "@sourceregistry/mikrotik-client/routeros";

export default (
    deviceId: string,
    siteId?: string
): TaskDefinition<{ deviceId: string }> => {
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
                    const fw = await FirmwareRepository.getVersion(deviceId);
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
                    const device = await TelemetryRepository.getDeviceById(deviceId);
                    if (!device) throw new Error(`Device ${deviceId} not found`);

                    const credentials = await TelemetryRepository.getCredentials(deviceId);
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
                    const device = await TelemetryRepository.getDeviceById(deviceId);
                    if (!device) throw new Error(`Device ${deviceId} not found`);

                    const credentials = await TelemetryRepository.getCredentials(deviceId);
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
                            await FirmwareRepository.upsertVersion({
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
