import { type AckInput, type DeviceRecord, type EnrollInput } from '$lib/server/services/devices.service/shared';
import { getDeviceByHost, updateDeviceLastSeen } from '$lib/server/repositories/telemetry.repository';

function nowIso(): string {
    return new Date().toISOString();
}

export default {
    async enroll(input: EnrollInput) {
        if (!input.serial || !input.model || !input.identity) {
            throw new Error('serial, model and identity are required');
        }

        const existing = await getDeviceByHost(input.serial);

        const record: DeviceRecord = {
            id: existing?.id ?? '',
            siteId: existing?.siteId ?? null,
            name: input.identity,
            platform: 'routeros' as const,
            adoptionMode: 'read_only' as const,
            adoptionState: existing?.adoptionState ?? 'discovered',
            connectionStatus: 'online' as const,
            host: input.serial,
            apiPort: 8728,
            sshPort: 22,
            identity: input.identity,
            model: input.model,
            serialNumber: input.serial,
            routerOsVersion: input.version ?? null,
            architecture: null,
            uptimeSeconds: null,
            capabilities: existing?.capabilities ?? [],
            tags: existing?.tags ?? [],
            lastSeenAt: nowIso(),
            lastSyncAt: existing?.lastSyncAt ? new Date(existing.lastSyncAt).toISOString() : null,
            createdAt: existing?.createdAt ? new Date(existing.createdAt).toISOString() : nowIso(),
            updatedAt: nowIso()
        };

        if (existing) {
            await updateDeviceLastSeen(existing.id);
        }

        if (record.adoptionState === 'inventoried' || record.adoptionState === 'fully_managed') {
            return {
                status: 'approved' as const,
                pubkeyUrl: '/api/v1/services/devices/bootstrap/controller.pub'
            };
        }

        return {
            status: 'pending' as const
        };
    },
    async getControllerPublicKey() {
        const key = process.env.CONTROLLER_SSH_PUBLIC_KEY;
        if (!key) {
            throw new Error('CONTROLLER_SSH_PUBLIC_KEY is not configured');
        }

        return key;
    },
    async ack(input: AckInput) {
        const device = await getDeviceByHost(input.serial);

        if (!device) {
            throw new Error(`Unknown device: ${input.serial}`);
        }

        return {
            ok: true,
            state: device.adoptionState
        };
    },
    async adopt(serial: string) {
        const device = await getDeviceByHost(serial);

        if (!device) {
            throw new Error(`Unknown device: ${serial}`);
        }

        await updateDeviceLastSeen(device.id);

        return {
            ok: true,
            serial,
            state: device.adoptionState
        };
    }
};
