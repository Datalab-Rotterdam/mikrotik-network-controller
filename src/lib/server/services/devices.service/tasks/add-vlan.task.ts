import {addVlan, type VlanInput} from "../lib/network-config";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";

export default (
    deviceId: string,
    siteId: string | null,
    input: VlanInput
): TaskDefinition<{ deviceId: string; input: VlanInput }> => {
    return {
        name: 'devices.network.add-vlan',
        deviceId,
        siteId,
        payload: { deviceId, input },
        failurePolicy: 'stop',
        steps: [
            {
                name: 'Add VLAN on device',
                async execute({ payload }) {
                    await addVlan(payload.deviceId, payload.input);
                    return { message: 'VLAN added' };
                }
            }
        ]
    };
}
