import type {ServiceModuleContext} from "$lib/server/services/devices.service/modules";
import provisionDeviceTask from "$lib/server/services/devices.service/tasks/provision-device.task";
import {Service} from '@sourceregistry/sveltekit-service-manager';

export default (ctx: ServiceModuleContext) => ({
    async provision(deviceId: string) {
        const task = await Service('scheduler').schedule(provisionDeviceTask(deviceId));

        return {
            ok: true,
            deviceId,
            jobId: task.id
        };
    }
});
