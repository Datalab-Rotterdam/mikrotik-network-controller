import {deleteFirewallRule} from "$lib/server/services/devices.service/network-config";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";

export default (
    deviceId: string,
    siteId: string | null,
    routerId: string
): TaskDefinition<{ deviceId: string; routerId: string }> => {
    return {
        name: 'devices.network.delete-firewall-rule',
        deviceId,
        siteId,
        payload: { deviceId, routerId },
        failurePolicy: 'stop',
        steps: [
            {
                name: 'Remove firewall rule on device',
                async execute({ payload }) {
                    await deleteFirewallRule(payload.deviceId, payload.routerId);
                    return { message: 'Firewall rule removed' };
                }
            }
        ]
    };
}
