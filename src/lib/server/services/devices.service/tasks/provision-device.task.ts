import {TelemetryRepository} from "$lib/server/repositories/telemetry.repository";
import { decryptSecret } from "$lib/server/security/secrets";
import {emitDeviceUpdated} from "$lib/server/services/devices.service/events";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";
import {RouterOSClient} from "@sourceregistry/mikrotik-client/routeros";

export default (deviceId: string): TaskDefinition<{ deviceId: string }> => {
    let device: Awaited<ReturnType<typeof TelemetryRepository.getDeviceById>>;
    let restCredential: Awaited<ReturnType<typeof TelemetryRepository.getCredentials>>[number] | undefined;
    let previousIdentity: string | null = null;

    return {
        name: 'devices.provision',
        deviceId,
        payload: { deviceId },
        failurePolicy: 'rollback',
        steps: [
            {
                name: 'Validate device and REST access',
                async execute() {
                    device = await TelemetryRepository.getDeviceById(deviceId);
                    if (!device) {
                        throw new Error(`Device ${deviceId} not found`);
                    }

                    const credentials = await TelemetryRepository.getCredentials(device.id);
                    restCredential = credentials.find((credential) => credential.purpose === 'read_only');

                    if (!restCredential?.secretEncrypted) {
                        throw new Error(`Device ${deviceId} is not ready for provisioning`);
                    }

                    previousIdentity = device.identity ?? device.name;

                    return {
                        message: 'Device and REST credential are ready',
                        data: {
                            host: device.host,
                            identity: previousIdentity
                        }
                    };
                }
            },
            {
                name: 'Apply controller identity',
                async execute() {
                    if (!device || !restCredential) {
                        throw new Error('Provisioning validation step did not complete');
                    }

                    const client = new RouterOSClient({
                        host: device.host,
                        port: device.apiPort,
                        username: restCredential.username,
                        password: decryptSecret(restCredential.secretEncrypted)
                    });

                    try {
                        const nextIdentity = `device-${device.id}`;
                        await client.system.identity.set(nextIdentity);

                        return {
                            message: 'Router identity updated',
                            data: { identity: nextIdentity }
                        };
                    } finally {
                        await client.close();
                    }
                },
                async revert() {
                    if (!device || !restCredential || !previousIdentity) {
                        return { message: 'No previous identity available' };
                    }

                    const client = new RouterOSClient({
                        host: device.host,
                        port: device.apiPort,
                        username: restCredential.username,
                        password: decryptSecret(restCredential.secretEncrypted)
                    });

                    try {
                        await client.system.identity.set(previousIdentity);

                        return {
                            message: 'Router identity reverted',
                            data: { identity: previousIdentity }
                        };
                    } finally {
                        await client.close();
                    }
                }
            },
            {
                name: 'Verify telemetry path',
                async execute() {
                    if (!device || !restCredential) {
                        throw new Error('Provisioning validation step did not complete');
                    }

                    const client = new RouterOSClient({
                        host: device.host,
                        port: device.apiPort,
                        username: restCredential.username,
                        password: decryptSecret(restCredential.secretEncrypted)
                    });

                    try {
                        const resource = await client.system.resource.get();
                        await TelemetryRepository.updateLastSeen(device.id);
                        await emitDeviceUpdated(device.id, 'telemetry');

                        return {
                            message: 'Telemetry path verified',
                            data: { resource }
                        };
                    } finally {
                        await client.close();
                    }
                }
            }
        ]
    };
}
