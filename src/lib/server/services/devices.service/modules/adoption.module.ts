import { type AckInput, type DeviceRecord, type EnrollInput } from '$lib/server/services/devices.service/shared';
import { Service } from '@sourceregistry/sveltekit-service-manager';
import { getDeviceByHost, updateDeviceLastSeen } from '$lib/server/repositories/telemetry.repository';
import { replaceCredential, updateDeviceState, upsertAdoptedDevice } from '$lib/server/repositories/device.repository';
import { encryptSecret } from '$lib/server/security/secrets';
import { getControllerSshPublicKey } from '$lib/server/security/controller-ssh-keys';
import { emitDeviceUpdated } from '$lib/server/services/device-events.service';
import { createAdoptCredentialsTask, createManagedAdoptCredentialsTask, createPrepareBootstrapTask } from '../tasks';


export default {
    async adoptWithCredentials(input: {
        host: string;
        username: string;
        password: string;
        siteName: string;
        siteId: string | null;
        apiPort: number;
        provider: 'real' | 'mock';
        platform: 'routeros' | 'switchos';
        requestedByUserId: string;
        managementCidrs?: string;
    }) {
        const task = await Service('scheduler').schedule(createManagedAdoptCredentialsTask(input));

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
        provider: 'real' | 'mock';
        platform: 'routeros' | 'switchos';
        requestedByUserId: string;
    }) {
        const task = await Service('scheduler').schedule(createAdoptCredentialsTask(input));

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
        const task = await Service('scheduler').schedule(createPrepareBootstrapTask(input));

        return {
            ok: true,
            jobId: task.id
        };
    },
    async enroll(input: EnrollInput) {
        if (!input.serial || !input.model || !input.identity) {
            throw new Error('serial, model and identity are required');
        }

        const existing = await getDeviceByHost(input.serial);

        const stored = await upsertAdoptedDevice({
            siteId: existing?.siteId ?? null,
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

        return { status: 'pending' as const };
    },
    async getControllerPublicKey() {
        return getControllerSshPublicKey();
    },
    async ack(input: AckInput) {
        const device = await getDeviceByHost(input.serial);

        if (!device) {
            throw new Error(`Unknown device: ${input.serial}`);
        }

        await replaceCredential({
            deviceId: device.id,
            purpose: 'read_only',
            username: input.restUser,
            secretEncrypted: encryptSecret(input.restPassword)
        });

        await replaceCredential({
            deviceId: device.id,
            purpose: 'write',
            username: input.managedUser,
            secretEncrypted: encryptSecret('ssh-key:controller')
        });

        await updateDeviceState(device.id, {
            adoptionMode: 'managed',
            adoptionState: 'fully_managed',
            connectionStatus: 'online'
        });
        await emitDeviceUpdated(device.id, 'adoption');

        return {
            ok: true,
            state: 'fully_managed' as const
        };
    },
    async adopt(serial: string) {
        const device = await getDeviceByHost(serial);

        if (!device) {
            throw new Error(`Unknown device: ${serial}`);
        }

        await updateDeviceState(device.id, {
            adoptionState: 'inventoried',
            connectionStatus: 'online'
        });
        await updateDeviceLastSeen(device.id);
        await emitDeviceUpdated(device.id, 'adoption');

        return {
            ok: true,
            serial,
            state: 'inventoried' as const
        };
    }
};
