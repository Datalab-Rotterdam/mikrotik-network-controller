import {RouterOSClient} from '@sourceregistry/mikrotik-client/routeros';
import {
    getDeviceById,
    getDeviceCredentials,
    listDevices,
    updateDeviceLastSeen
} from '$lib/server/repositories/telemetry.repository';
import {decryptSecret} from '$lib/server/security/secrets';
import { emitDeviceUpdated } from '$lib/server/services/device-events.service';

export default {
    async list() {
        return listDevices();
    },

    async get(id: string) {
        const device = await getDeviceById(id);
        if (!device) {
            return null;
        }

        return {
            id: device.id,
            siteId: device.siteId,
            name: device.name,
            platform: device.platform,
            adoptionMode: device.adoptionMode,
            adoptionState: device.adoptionState,
            connectionStatus: device.connectionStatus,
            host: device.host,
            apiPort: device.apiPort,
            sshPort: device.sshPort,
            identity: device.identity,
            model: device.model,
            serialNumber: device.serialNumber,
            routerOsVersion: device.routerOsVersion,
            architecture: device.architecture,
            uptimeSeconds: device.uptimeSeconds,
            capabilities: device.capabilities,
            tags: device.tags,
            lastSeenAt: device.lastSeenAt,
            lastSyncAt: device.lastSyncAt,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt
        };
    },

    async stats(id: string) {
        const device = await getDeviceById(id);
        if (!device) {
            throw new Error(`Device ${id} not found`);
        }

        const credentials = await getDeviceCredentials(device.id);
        const restCredential = credentials.find((c: { purpose: string }) => c.purpose === 'read_only');

        if (!restCredential || !restCredential.secretEncrypted) {
            throw new Error(`Device ${id} is not ready for REST telemetry`);
        }

        const client = new RouterOSClient({
            host: device.host,
            port: device.apiPort,
            username: restCredential.username,
            password: decryptSecret(restCredential.secretEncrypted)
        });

        try {
            const [resource, interfaces] = await Promise.all([
                client.system.resource.get(),
                client.interface.list()
            ]);

            await updateDeviceLastSeen(device.id);
            await emitDeviceUpdated(device.id, 'telemetry');

            return {
                id: device.id,
                host: device.host,
                resource,
                interfaces
            };
        } finally {
            await client.close();
        }
    }
};
