import provisionDeviceTask from "$lib/server/services/devices.service/tasks/provision-device.task";
import { Service } from '@sourceregistry/sveltekit-service-manager';

export default {
    async provision(deviceId: string) {
        const task = await Service('scheduler').schedule(provisionDeviceTask(deviceId));

        return {
            ok: true,
            deviceId,
            jobId: task.id
        };
    }
};
