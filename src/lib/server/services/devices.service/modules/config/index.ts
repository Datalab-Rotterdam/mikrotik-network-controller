import {Service} from '@sourceregistry/sveltekit-service-manager';
import type {DeployVariableValues} from '$lib/server/services/config-deploy.service';
import {createConfigDeployTask} from './tasks';

export default {
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
			createConfigDeployTask({deviceId, templateId, variableValues, siteId})
		);

		return {
			ok: true,
			deviceId,
			templateId,
			jobId: task.id
		};
	}
};
