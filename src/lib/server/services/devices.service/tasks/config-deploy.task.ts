import {deployConfig, type DeployVariableValues} from "../lib/config-deploy";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";

export default (input: {
    deviceId: string;
    templateId: string;
    variableValues: DeployVariableValues;
    siteId?: string;
}): TaskDefinition<{ deviceId: string; templateId: string; variableValues: DeployVariableValues }> => {
    const { deviceId, templateId, variableValues, siteId } = input;
    return {
        name: 'config.deploy',
        deviceId,
        siteId: siteId ?? null,
        payload: { deviceId, templateId, variableValues },
        failurePolicy: 'stop',
        steps: [
            {
                name: 'Render & validate template',
                async execute() {
                    const result = await deployConfig({
                        templateId,
                        deviceId,
                        variableValues,
                        mode: 'apply'
                    });

                    if (result.mode === 'dry-run') {
                        throw new Error('Expected apply mode result');
                    }

                    return {
                        message: `Config deployed to device via ${result.steps.length} steps`,
                        data: {
                            deploymentId: result.deploymentId,
                            steps: result.steps
                        }
                    };
                }
            }
        ]
    };
}
