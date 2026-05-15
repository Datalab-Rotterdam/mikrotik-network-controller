import {DeviceRepository} from "$lib/server/repositories/device.repository";
import {TelemetryRepository} from "$lib/server/repositories/telemetry.repository";
import {decryptSecret} from "$lib/server/security/secrets";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";
import {RouterOSClient} from "@sourceregistry/mikrotik-client/routeros";

export default (input: {
    deviceId: string;
    name: string;
    siteId?: string;
}): TaskDefinition<{ deviceId: string; name: string; previousIdentity: string | null }> => {
    const {deviceId, name, siteId} = input;
    return {
        name: 'devices.rename-identity',
        deviceId,
        siteId: siteId ?? null,
        payload: {deviceId, name, previousIdentity: null},
        failurePolicy: 'rollback',
        steps: [
            {
                name: 'Update MikroTik identity',
                async execute({payload}) {
                    const device = await DeviceRepository.getByIdForSite(deviceId, siteId ?? '');
                    if (!device) throw new Error('Device not found');

                    const credentials = await TelemetryRepository.getActiveCredential(device.id, 'read_only');
                    if (!credentials) throw new Error('No credentials available');

                    const client = new RouterOSClient({
                        host: device.host,
                        port: device.apiPort,
                        username: credentials.username,
                        password: decryptSecret(credentials.secretEncrypted)
                    });

                    try {
                        await client.system.identity.set(payload.name);
                        return {
                            message: `Identity updated to ${payload.name}`,
                            data: {previousIdentity: device.identity}
                        };
                    } finally {
                        await client.close();
                    }
                },
                async revert({payload}) {
                    const previousIdentity = payload.previousIdentity;
                    if (!previousIdentity) {
                        return {message: 'No previous identity available'};
                    }

                    const device = await DeviceRepository.getByIdForSite(deviceId, siteId ?? '');
                    if (!device) return {message: 'Device not found for revert'};

                    const credentials = await TelemetryRepository.getActiveCredential(device.id, 'read_only');
                    if (!credentials) return {message: 'No credentials available for revert'};

                    const client = new RouterOSClient({
                        host: device.host,
                        port: device.apiPort,
                        username: credentials.username,
                        password: decryptSecret(credentials.secretEncrypted)
                    });

                    try {
                        await client.system.identity.set(previousIdentity);
                        return {message: `Identity reverted to ${previousIdentity}`};
                    } finally {
                        await client.close();
                    }
                }
            }
        ]
    };
}
