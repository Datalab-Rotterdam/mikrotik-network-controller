import type {ServiceModuleContext} from "$lib/server/services/devices.service/modules";
import configDeployTask from "$lib/server/services/devices.service/tasks/config-deploy.task";
import {Service} from '@sourceregistry/sveltekit-service-manager/server';
import type {DeployVariableValues} from '../lib/config-deploy';
import {extractPlaceholders, renderTemplate, diffConfigs} from '../lib/template-renderer';

export default (ctx: ServiceModuleContext) => ({
    /**
     * Deploy a template config to a device via the scheduler.
     */
    async deploy({
                     deviceId,
                     templateId,
                     variableValues,
                     siteId
                 }: {
        deviceId: string;
        templateId: string;
        variableValues: DeployVariableValues;
        siteId?: string;
    }) {
        const task = await Service('scheduler').schedule(
            configDeployTask({deviceId, templateId, variableValues, siteId})
        );

        return {
            ok: true,
            deviceId,
            templateId,
            jobId: task.id
        };
    },

    extractPlaceholders,
    renderTemplate,
    diffConfigs
});
