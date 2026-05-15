import configDeployTask from "$lib/server/services/devices.service/tasks/config-deploy.task";
import { Service } from '@sourceregistry/sveltekit-service-manager';
import type { DeployVariableValues } from '$lib/server/services/devices.service/config-deploy';

export default {
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
			configDeployTask({ deviceId, templateId, variableValues, siteId })
		);

		return {
			ok: true,
			deviceId,
			templateId,
			jobId: task.id
		};
	}
};
