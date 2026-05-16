import type {ServiceModuleContext} from "$lib/server/services/devices.service/modules";
import {type AckInput, type DeviceRecord, type EnrollInput} from '$lib/server/services/devices.service/shared';
import adoptCredentialsTask from "$lib/server/services/devices.service/tasks/adopt-credentials.task";
import managedAdoptCredentialsTask from "$lib/server/services/devices.service/tasks/managed-adopt-credentials.task";
import prepareBootstrapTask from "$lib/server/services/devices.service/tasks/prepare.bootstrap.task";
import {Action, Service} from '@sourceregistry/sveltekit-service-manager/server';
import {TelemetryRepository} from '$lib/server/repositories/telemetry.repository';
import {DeviceRepository} from '$lib/server/repositories/device.repository';
import {AgentRepository} from '$lib/server/repositories/agent.repository';
import {encryptSecret} from '$lib/server/security/secrets';
import {getControllerSshPublicKey} from '$lib/server/security/controller-ssh-keys';
import {emitDeviceUpdated} from '$lib/server/services/devices.service/emitter';

export default function ({router}: ServiceModuleContext) {
    router.POST("/enroll", async ({request}) => {
        const body = await request.json();
        const result = await module.enroll(body);
        return Action.success(200, result);
    });

    router.GET("/bootstrap/controller.pub", async () => {
        const key = await module.getControllerPublicKey();
        return new Response(key + "\n", {
            headers: { "content-type": "text/plain; charset=utf-8" }
        });
    });

    router.POST("/bootstrap/ack", async ({request}) => {
        const body = await request.json();
        const origin = new URL(request.url).origin;
        const result = await module.ack({ ...body, controllerBaseUrl: origin });
        return Action.success(200, result);
    });

    const module = {
        async adoptWithCredentials(input: {
            host: string;
            username: string;
            password: string;
            siteName: string;
            siteId: string | null;
            apiPort: number;
            platform: 'routeros' | 'switchos';
            requestedByUserId: string;
            managementCidrs?: string;
        }) {
            const task = await Service('scheduler').schedule(managedAdoptCredentialsTask(input));

            return {
                ok: true,
                jobId: task.id
            };
        },
        async adoptReadOnlyWithCredentials(input: {
            host: string;
            username: string;
            password: string;
            siteName: string;
            siteId: string | null;
            apiPort: number;
            platform: 'routeros' | 'switchos';
            requestedByUserId: string;
        }) {
            const task = await Service('scheduler').schedule(adoptCredentialsTask(input));

            return {
                ok: true,
                jobId: task.id
            };
        },
        async prepareBootstrap(input: {
            siteId: string;
            requestedByUserId: string;
            controllerBaseUrl: string;
            managementCidrs?: string;
            bootstrapToken?: string;
            wwwSslCertificateName?: string;
        }) {
            const task = await Service('scheduler').schedule(prepareBootstrapTask(input));

            return {
                ok: true,
                jobId: task.id
            };
        },
        async enroll(input: EnrollInput) {
            if (!input.serial || !input.model || !input.identity) {
                throw new Error('serial, model and identity are required');
            }

            // Validate install token if provided
            let tokenSiteId: string | null = null;
            if (input.token) {
                const installToken = await AgentRepository.findValidToken(input.token);
                if (!installToken) {
                    throw new Error('Invalid or expired install token');
                }
                tokenSiteId = installToken.siteId;
            }

            const existing = await TelemetryRepository.getDeviceByHost(input.serial);

            const stored = await DeviceRepository.upsertAdopted({
                siteId: tokenSiteId ?? existing?.siteId ?? null,
                name: input.identity,
                platform: 'routeros',
                adoptionMode: existing?.adoptionMode ?? 'read_only',
                adoptionState: existing?.adoptionState ?? 'discovered',
                connectionStatus: 'online',
                host: input.serial,
                apiPort: existing?.apiPort ?? 8728,
                sshPort: existing?.sshPort ?? 22,
                identity: input.identity,
                model: input.model,
                serialNumber: input.serial,
                routerOsVersion: input.version ?? null,
                architecture: existing?.architecture ?? null,
                uptimeSeconds: existing?.uptimeSeconds ?? null,
                capabilities: existing?.capabilities ?? [],
                tags: existing?.tags ?? [],
                lastSeenAt: new Date(),
                lastSyncAt: existing?.lastSyncAt ? new Date(existing.lastSyncAt) : null
            });
            await emitDeviceUpdated(stored.id, 'enrollment');

            const record: DeviceRecord = {
                id: stored.id,
                siteId: stored.siteId,
                name: stored.name,
                platform: stored.platform,
                adoptionMode: stored.adoptionMode,
                adoptionState: stored.adoptionState,
                connectionStatus: stored.connectionStatus,
                host: stored.host,
                apiPort: stored.apiPort,
                sshPort: stored.sshPort,
                identity: stored.identity,
                model: stored.model,
                serialNumber: stored.serialNumber,
                routerOsVersion: stored.routerOsVersion,
                architecture: stored.architecture,
                uptimeSeconds: stored.uptimeSeconds,
                capabilities: stored.capabilities,
                tags: stored.tags,
                lastSeenAt: stored.lastSeenAt?.toISOString() ?? null,
                lastSyncAt: stored.lastSyncAt?.toISOString() ?? null,
                createdAt: stored.createdAt.toISOString(),
                updatedAt: stored.updatedAt.toISOString()
            };

            if (record.adoptionState === 'inventoried' || record.adoptionState === 'fully_managed') {
                return {
                    status: 'approved' as const,
                    pubkeyUrl: '/api/v1/services/devices/bootstrap/controller.pub'
                };
            }

            return {status: 'pending' as const};
        },
        async getControllerPublicKey() {
            return getControllerSshPublicKey();
        },
        async ack(input: AckInput & { controllerBaseUrl?: string }) {
            const device = await TelemetryRepository.getDeviceByHost(input.serial);

            if (!device) {
                throw new Error(`Unknown device: ${input.serial}`);
            }

            await DeviceRepository.replaceCredential({
                deviceId: device.id,
                purpose: 'read_only',
                username: input.restUser,
                secretEncrypted: encryptSecret(input.restPassword)
            });

            await DeviceRepository.replaceCredential({
                deviceId: device.id,
                purpose: 'write',
                username: input.managedUser,
                secretEncrypted: encryptSecret('ssh-key:controller')
            });

            await DeviceRepository.updateState(device.id, {
                adoptionMode: 'managed',
                adoptionState: 'fully_managed',
                connectionStatus: 'online'
            });

            // Generate agent token for ongoing checkins
            const agentToken = Service('agent').generateToken();
            await DeviceRepository.setAgentToken(device.id, agentToken);

            // Claim any pending install token for this device
            if (input.serial) {
                const tokens = await AgentRepository.listBySite(device.siteId ?? '');
                const unclaimed = tokens.find((t) => !t.claimedAt && !t.deviceId);
                if (unclaimed) {
                    await AgentRepository.claimToken(unclaimed.token, device.id);
                }
            }

            await emitDeviceUpdated(device.id, 'adoption');

            const agentScript = input.controllerBaseUrl
                ? Service('agent').generateBootstrapAgentScript({
                    controllerBaseUrl: input.controllerBaseUrl,
                    agentToken
                })
                : null;

            return {
                ok: true,
                state: 'fully_managed' as const,
                agentScript
            };
        },
        async adopt(serial: string) {
            const device = await TelemetryRepository.getDeviceByHost(serial);

            if (!device) {
                throw new Error(`Unknown device: ${serial}`);
            }

            await DeviceRepository.updateState(device.id, {
                adoptionState: 'inventoried',
                connectionStatus: 'online'
            });
            await TelemetryRepository.updateLastSeen(device.id);
            await emitDeviceUpdated(device.id, 'adoption');

            return {
                ok: true,
                serial,
                state: 'inventoried' as const
            };
        }
    } as const;

    return module;
};
