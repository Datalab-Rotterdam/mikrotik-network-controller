import { configurePort, type PortConfigInput } from '$lib/server/services/devices.service/network-config';
import type { TaskDefinition } from '$lib/server/services/scheduler.service/types';

export default (
	deviceId: string,
	siteId: string | null,
	portName: string,
	newConfig: PortConfigInput,
	previousConfig: PortConfigInput
): TaskDefinition<{ deviceId: string; portName: string; newConfig: PortConfigInput; previousConfig: PortConfigInput }> => {
	return {
		name: 'devices.port.configure',
		deviceId,
		siteId,
		payload: { deviceId, portName, newConfig, previousConfig },
		failurePolicy: 'rollback',
		steps: [
			{
				name: 'Configure port',
				async execute({ payload }) {
					await configurePort(payload.deviceId, payload.portName, payload.newConfig);
					return { message: `Port ${payload.portName} configured` };
				},
				async revert({ payload }) {
					await configurePort(payload.deviceId, payload.portName, payload.previousConfig);
				}
			}
		]
	};
};
