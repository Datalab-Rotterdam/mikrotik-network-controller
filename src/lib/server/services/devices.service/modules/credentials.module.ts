import { RouterOSSshClient } from '@sourceregistry/mikrotik-client/routeros';
import { getDeviceById, getDeviceCredentials, updateDeviceLastSeen } from '$lib/server/repositories/telemetry.repository';

export default {
    async rotateRestSecret(serial: string) {
        const device = await getDeviceById(serial);
        if (!device) {
            throw new Error(`Device ${serial} not found`);
        }

        const credentials = await getDeviceCredentials(device.id);
        const managedCredential = credentials.find((c: { purpose: string }) => c.purpose === 'write');

        if (!managedCredential) {
            throw new Error(`Device ${serial} is not ready for credential rotation`);
        }

        const newSecret = managedCredential.secretEncrypted;

        const ssh = new RouterOSSshClient({
            host: device.host,
            username: managedCredential.username,
            identityFile: process.env.CONTROLLER_SSH_PRIVATE_KEY ?? '',
            port: device.sshPort
        });

        await ssh.execute(
            `/user set [find where name="controller-rest"] password="${newSecret}"`
        );

        await updateDeviceLastSeen(device.id);

        return {
            ok: true,
            serial
        };
    }
};
