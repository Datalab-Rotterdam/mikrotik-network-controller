import {deleteVlan} from "$lib/server/services/devices.service/network-config";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";

export default (
    deviceId: string,
    siteId: string | null,
    routerId: string
): TaskDefinition<{ deviceId: string; routerId: string }> => {
    return {
        name: 'devices.network.delete-vlan',
        deviceId,
        siteId,
        payload: { deviceId, routerId },
        failurePolicy: 'stop',
        steps: [
            {
                name: 'Remove VLAN on device',
                async execute({ payload }) {
                    await deleteVlan(payload.deviceId, payload.routerId);
                    return { message: 'VLAN removed' };
                }
            }
        ]
    };
}
