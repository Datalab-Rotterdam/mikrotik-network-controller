import type {ServiceModuleContext} from "$lib/server/services/devices.service/modules";
import rotateRestSecretTask from "$lib/server/services/devices.service/tasks/rotate-rest-secret.task";
import { Service } from '@sourceregistry/sveltekit-service-manager';

export default (ctx: ServiceModuleContext) => ({
    async rotateRestSecret(deviceId: string) {
        const task = await Service('scheduler').schedule(rotateRestSecretTask(deviceId));

        return {
            ok: true,
            deviceId,
            jobId: task.id
        };
    }
});
