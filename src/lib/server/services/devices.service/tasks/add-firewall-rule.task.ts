import {addFirewallRule, type FirewallRuleInput} from "../lib/network-config";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";

export default (
    deviceId: string,
    siteId: string | null,
    input: FirewallRuleInput
): TaskDefinition<{ deviceId: string; input: FirewallRuleInput }> => {
    return {
        name: 'devices.network.add-firewall-rule',
        deviceId,
        siteId,
        payload: { deviceId, input },
        failurePolicy: 'stop',
        steps: [
            {
                name: 'Add firewall rule on device',
                async execute({ payload }) {
                    await addFirewallRule(payload.deviceId, payload.input);
                    return { message: 'Firewall rule added' };
                }
            }
        ]
    };
}
