import {AuditRepository} from "$lib/server/repositories/audit.repository";
import {DeviceRepository} from "$lib/server/repositories/device.repository";
import {TelemetryRepository} from "$lib/server/repositories/telemetry.repository";
import {getControllerSshPrivateKeyPath} from "$lib/server/security/controller-ssh-keys";
import {emitDeviceRemoved} from "$lib/server/services/devices.service/emitter";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";
import {RouterOSSshClient} from "@sourceregistry/mikrotik-client/routeros";

function resetCommandWasAccepted(error: unknown): boolean {
    const result = typeof error === 'object' && error && 'result' in error
        ? (error as { result?: { stdout?: string; stderr?: string } }).result
        : undefined;
    const output = [
        result?.stdout,
        result?.stderr,
        error instanceof Error ? error.message : String(error)
    ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();

    return output.includes('reset') || output.includes('reboot');
}

function isConnectionError(error: unknown): boolean {
    const parts = [
        error instanceof Error ? error.message : String(error),
        typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : ''
    ].join('\n').toLowerCase();

    return parts.includes('econnrefused') ||
        parts.includes('etimedout') ||
        parts.includes('enotfound') ||
        parts.includes('ehostunreach') ||
        parts.includes('enetunreach') ||
        parts.includes('connection refused') ||
        parts.includes('timed out') ||
        parts.includes('no route to host');
}


export default (input: {
    deviceId: string;
    siteId: string | null;
    requestedByUserId: string;
}): TaskDefinition<{ deviceId: string; siteId: string | null }> => {
    let device: Awaited<ReturnType<typeof TelemetryRepository.getDeviceById>>;
    let managedCredential: Awaited<ReturnType<typeof TelemetryRepository.getCredentials>>[number] | undefined;
    let controllerPrivateKeyPath = '';
    let shouldReset = false;

    async function recordAuditEvent(input: typeof import('$lib/server/db/schema').auditEvents.$inferInsert): Promise<void> {
        await AuditRepository.record(input);
    }

    async function recordFailure(error: unknown, stage: string): Promise<void> {
        await recordAuditEvent({
            actorUserId: input.requestedByUserId,
            targetDeviceId: device?.id,
            action: 'device.removal.failed',
            message: `Failed to remove ${device?.identity ?? device?.name ?? input.deviceId}`,
            metadata: {
                deviceId: input.deviceId,
                host: device?.host,
                stage,
                error: error instanceof Error ? error.message : String(error)
            }
        });
    }

    return {
        name: 'devices.remove',
        deviceId: input.deviceId,
        siteId: input.siteId,
        requestedByUserId: input.requestedByUserId,
        payload: {
            deviceId: input.deviceId,
            siteId: input.siteId
        },
        failurePolicy: 'stop',
        steps: [
            {
                name: 'Validate device and prepare removal',
                async execute() {
                    try {
                        device = await TelemetryRepository.getDeviceById(input.deviceId);
                        if (!device) {
                            throw new Error(`Device ${input.deviceId} not found`);
                        }

                        if (device.siteId !== input.siteId) {
                            throw new Error(`Device ${input.deviceId} does not belong to the requested site`);
                        }

                        const credentials = await TelemetryRepository.getCredentials(device.id);
                        managedCredential = credentials.find((credential) => credential.purpose === 'write');

                        const isOnline = device.connectionStatus === 'online';
                        const isManaged = device.adoptionMode === 'managed' && device.adoptionState !== 'discovered';

                        if (managedCredential && isOnline && isManaged) {
                            controllerPrivateKeyPath = await getControllerSshPrivateKeyPath();
                            shouldReset = true;
                        }

                        const skipReason = !isManaged ? 'not_managed'
                            : !managedCredential ? 'no_ssh_trust'
                            : !isOnline ? 'offline'
                            : undefined;

                        return {
                            message: shouldReset
                                ? 'Device is online and managed â€” will factory reset before removal'
                                : `Removal will proceed without factory reset (${skipReason})`,
                            data: { host: device.host, shouldReset, skipReason }
                        };
                    } catch (error) {
                        await recordFailure(error, 'validate');
                        throw error;
                    }
                }
            },
            {
                name: 'Factory reset RouterOS device',
                async execute() {
                    if (!shouldReset || !device || !managedCredential || !controllerPrivateKeyPath) {
                        return {
                            message: 'Factory reset skipped â€” device will be removed from controller only',
                            data: { skipped: true }
                        };
                    }

                    try {
                        const ssh = new RouterOSSshClient({
                            host: device.host,
                            username: managedCredential.username,
                            identityFile: controllerPrivateKeyPath,
                            port: device.sshPort,
                            timeoutMs: 15_000
                        });

                        try {
                            const result = await ssh.execute('/system reset-configuration', {
                                attributes: {
                                    'skip-backup': true
                                },
                                stdin: 'y\n',
                                timeoutMs: 15_000
                            });

                            return {
                                message: 'Factory reset command accepted',
                                data: {
                                    exitCode: result.exitCode,
                                    signal: result.signal
                                }
                            };
                        } catch (error) {
                            if (resetCommandWasAccepted(error)) {
                                return {
                                    message: 'Factory reset command accepted before SSH disconnected',
                                    data: { disconnected: true }
                                };
                            }

                            if (isConnectionError(error)) {
                                return {
                                    message: 'Device unreachable at reset time â€” reset skipped, proceeding to remove controller records',
                                    data: { skipped: true, connectionFailed: true }
                                };
                            }

                            throw error;
                        }
                    } catch (error) {
                        await recordFailure(error, 'factory_reset');
                        throw error;
                    }
                }
            },
            {
                name: 'Remove controller records',
                async execute() {
                    try {
                        if (!device) {
                            throw new Error('Removal validation step did not complete');
                        }

                        await AuditRepository.record({
                            actorUserId: input.requestedByUserId,
                            targetDeviceId: device.id,
                            action: 'device.removed.reset',
                            message: `${device.identity ?? device.name} was reset and removed from the controller`,
                            metadata: {
                                deviceId: device.id,
                                host: device.host,
                                siteId: device.siteId
                            }
                        });

                        await DeviceRepository.delete(device.id);
                        emitDeviceRemoved({
                            siteId: device.siteId,
                            deviceId: device.id
                        });

                        return {
                            message: 'Controller records removed',
                            data: {
                                deviceId: device.id
                            }
                        };
                    } catch (error) {
                        await recordFailure(error, 'delete_controller_records');
                        throw error;
                    }
                }
            }
        ]
    };
}

