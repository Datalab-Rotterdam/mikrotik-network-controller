import {RouterOSSshClient} from '@sourceregistry/mikrotik-client/routeros';
import {Service} from '@sourceregistry/sveltekit-service-manager';
import {recordAuditEvent} from '$lib/server/repositories/audit.repository';
import {deleteDevice} from '$lib/server/repositories/device.repository';
import {getDeviceById, getDeviceCredentials} from '$lib/server/repositories/telemetry.repository';
import {getControllerSshPrivateKeyPath} from '$lib/server/security/controller-ssh-keys';
import type {TaskDefinition} from '$lib/server/services/scheduler.service/types';

function resetCommandWasAccepted(error: unknown): boolean {
	const result = typeof error === 'object' && error && 'result' in error
		? (error as {result?: {stdout?: string; stderr?: string}}).result
		: undefined;
	const output = [
		result?.stdout,
		result?.stderr,
		error instanceof Error ? error.message : String(error)
	]
		.filter(Boolean)
		.join('\n')
		.toLowerCase();

	return output.includes('reset') || output.includes('reboot');
}

export function createRemoveDeviceTask(input: {
	deviceId: string;
	siteId: string | null;
	requestedByUserId: string;
}): TaskDefinition<{deviceId: string; siteId: string | null}> {
	let device: Awaited<ReturnType<typeof getDeviceById>>;
	let managedCredential: Awaited<ReturnType<typeof getDeviceCredentials>>[number] | undefined;
	let controllerPrivateKeyPath = '';

	async function recordFailure(error: unknown, stage: string): Promise<void> {
		await recordAuditEvent({
			actorUserId: input.requestedByUserId,
			targetDeviceId: device?.id,
			action: 'device.removal.failed',
			message: `Failed to remove ${device?.identity ?? device?.name ?? input.deviceId}`,
			metadata: {
				deviceId: input.deviceId,
				host: device?.host,
				stage,
				error: error instanceof Error ? error.message : String(error)
			}
		});
	}

	return {
		name: 'devices.remove',
		deviceId: input.deviceId,
		siteId: input.siteId,
		requestedByUserId: input.requestedByUserId,
		payload: {
			deviceId: input.deviceId,
			siteId: input.siteId
		},
		failurePolicy: 'stop',
		steps: [
			{
				name: 'Validate device and SSH trust',
				async execute() {
					try {
						device = await getDeviceById(input.deviceId);
						if (!device) {
							throw new Error(`Device ${input.deviceId} not found`);
						}

						if (device.siteId !== input.siteId) {
							throw new Error(`Device ${input.deviceId} does not belong to the requested site`);
						}

						if (device.platform !== 'routeros') {
							throw new Error('Only RouterOS devices can be reset by this removal action');
						}

						if (device.adoptionState === 'discovered') {
							throw new Error(`Device ${input.deviceId} is not adopted`);
						}

						const credentials = await getDeviceCredentials(device.id);
						managedCredential = credentials.find((credential) => credential.purpose === 'write');

						if (!managedCredential) {
							throw new Error(`Device ${input.deviceId} has no active SSH trust credential`);
						}

						controllerPrivateKeyPath = await getControllerSshPrivateKeyPath();

						return {
							message: 'Removal inputs are ready',
							data: {
								host: device.host,
								managedUser: managedCredential.username
							}
						};
					} catch (error) {
						await recordFailure(error, 'validate');
						throw error;
					}
				}
			},
			{
				name: 'Factory reset RouterOS device',
				async execute() {
					try {
						if (!device || !managedCredential || !controllerPrivateKeyPath) {
							throw new Error('Removal validation step did not complete');
						}

						const ssh = new RouterOSSshClient({
							host: device.host,
							username: managedCredential.username,
							identityFile: controllerPrivateKeyPath,
							port: device.sshPort,
							timeoutMs: 15_000
						});

						try {
							const result = await ssh.execute('/system reset-configuration', {
								attributes: {
									'skip-backup': true
								},
								stdin: 'y\n',
								timeoutMs: 15_000
							});

							return {
								message: 'Factory reset command accepted',
								data: {
									exitCode: result.exitCode,
									signal: result.signal
								}
							};
						} catch (error) {
							if (resetCommandWasAccepted(error)) {
								return {
									message: 'Factory reset command accepted before SSH disconnected',
									data: {
										disconnected: true
									}
								};
							}

							throw error;
						}
					} catch (error) {
						await recordFailure(error, 'factory_reset');
						throw error;
					}
				}
			},
			{
				name: 'Remove controller records',
				async execute() {
					try {
						if (!device) {
							throw new Error('Removal validation step did not complete');
						}

						await recordAuditEvent({
							actorUserId: input.requestedByUserId,
							targetDeviceId: device.id,
							action: 'device.removed.reset',
							message: `${device.identity ?? device.name} was reset and removed from the controller`,
							metadata: {
								deviceId: device.id,
								host: device.host,
								siteId: device.siteId
							}
						});

						await deleteDevice(device.id);
						Service('devices').event.emit('device.removed', {
							siteId: device.siteId,
							deviceId: device.id,
							timestamp: new Date().toISOString()
						});

						return {
							message: 'Controller records removed',
							data: {
								deviceId: device.id
							}
						};
					} catch (error) {
						await recordFailure(error, 'delete_controller_records');
						throw error;
					}
				}
			}
		]
	};
}
