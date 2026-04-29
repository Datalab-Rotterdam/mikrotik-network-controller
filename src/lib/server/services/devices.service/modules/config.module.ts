import { Service } from '@sourceregistry/sveltekit-service-manager';
import { createConfigDeployTask } from '../tasks';
import type { DeployVariableValues } from '$lib/server/services/config-deploy.service';

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
			createConfigDeployTask({ deviceId, templateId, variableValues, siteId })
		);

		return {
			ok: true,
			deviceId,
			templateId,
			jobId: task.id
		};
	}
};
