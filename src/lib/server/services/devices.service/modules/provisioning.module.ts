import { RouterOSClient } from '@sourceregistry/mikrotik-client/routeros';
import { getDeviceById, getDeviceCredentials } from '$lib/server/repositories/telemetry.repository';

export default {
    async provision(serial: string) {
        const device = await getDeviceById(serial);
        if (!device) {
            throw new Error(`Device ${serial} not found`);
        }

        const credentials = await getDeviceCredentials(device.id);
        const restCredential = credentials.find((c: { purpose: string }) => c.purpose === 'read_only');

        if (!restCredential || !restCredential.secretEncrypted) {
            throw new Error(`Device ${serial} is not ready for provisioning`);
        }

        const client = new RouterOSClient({
            host: device.host,
            port: device.apiPort,
            username: restCredential.username,
            password: restCredential.secretEncrypted
        });

        try {
            await client.execute('/system/identity/set', {
                attributes: {
                    '.id': '*1',
                    name: `device-${serial}`
                }
            });

            return {
                ok: true,
                serial
            };
        } finally {
            await client.close();
        }
    }
};
