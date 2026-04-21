import { Service } from '@sourceregistry/sveltekit-service-manager';
import { createRotateRestSecretTask } from '../tasks';

export default {
    async rotateRestSecret(deviceId: string) {
        const task = await Service('scheduler').schedule(createRotateRestSecretTask(deviceId));

        return {
            ok: true,
            deviceId,
            jobId: task.id
        };
    }
};
