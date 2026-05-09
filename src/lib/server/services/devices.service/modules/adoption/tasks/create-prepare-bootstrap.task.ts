import {ensureControllerSshKeyPair} from '$lib/server/security/controller-ssh-keys';
import type {TaskDefinition} from '$lib/server/services/scheduler.service/types';
import {generateBootstrapScript} from '../bootstrap-script';

export function createPrepareBootstrapTask(input: {
	siteId: string;
	requestedByUserId: string;
	controllerBaseUrl: string;
	managementCidrs?: string;
	bootstrapToken?: string;
	wwwSslCertificateName?: string;
}): TaskDefinition<{
	siteId: string;
	requestedByUserId: string;
	controllerBaseUrl: string;
	managementCidrs?: string;
	wwwSslCertificateName?: string;
}> {
	let controllerBaseUrl = '';
	let script = '';

	return {
		name: 'devices.bootstrap.prepare',
		siteId: input.siteId,
		requestedByUserId: input.requestedByUserId,
		payload: {
			siteId: input.siteId,
			requestedByUserId: input.requestedByUserId,
			controllerBaseUrl: input.controllerBaseUrl,
			managementCidrs: input.managementCidrs,
			wwwSslCertificateName: input.wwwSslCertificateName
		},
		failurePolicy: 'stop',
		steps: [
			{
				name: 'Validate bootstrap request',
				async execute() {
					if (!input.controllerBaseUrl) {
						throw new Error('Controller base URL is required');
					}

					const url = new URL(input.controllerBaseUrl);
					if (url.protocol !== 'http:' && url.protocol !== 'https:') {
						throw new Error('Controller base URL must use HTTP or HTTPS');
					}

					return {
						message: 'Bootstrap request is valid',
						data: {
							controllerBaseUrl: url.origin
						}
					};
				}
			},
			{
				name: 'Prepare controller SSH key material',
				async execute() {
					controllerBaseUrl = new URL(input.controllerBaseUrl).origin;
					const keyPair = await ensureControllerSshKeyPair();

					return {
						message: 'Controller SSH key material is ready',
						data: {
							enrollUrl: `${controllerBaseUrl}/api/v1/services/devices/enroll`,
							publicKeyUrl: `${controllerBaseUrl}/api/v1/services/devices/bootstrap/controller.pub`,
							ackUrl: `${controllerBaseUrl}/api/v1/services/devices/bootstrap/ack`,
							publicKeyPath: keyPair.publicKeyPath
						}
					};
				}
			},
			{
				name: 'Generate RouterOS bootstrap script',
				async execute() {
					script = generateBootstrapScript({
						controllerBaseUrl,
						bootstrapToken: input.bootstrapToken,
						managementCidrs: input.managementCidrs,
						wwwSslCertificateName: input.wwwSslCertificateName
					});

					return {
						message: 'Bootstrap script generated',
						data: {
							script,
							controllerBaseUrl
						}
					};
				}
			}
		]
	};
}
