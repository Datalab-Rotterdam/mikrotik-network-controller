import { Service } from '@sourceregistry/sveltekit-service-manager';
import { createProvisionDeviceTask } from '../tasks';

export default {
    async provision(deviceId: string) {
        const task = await Service('scheduler').schedule(createProvisionDeviceTask(deviceId));

        return {
            ok: true,
            deviceId,
            jobId: task.id
        };
    }
};
