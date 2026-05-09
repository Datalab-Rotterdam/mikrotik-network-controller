import {RouterOSSshClient} from '@sourceregistry/mikrotik-client/routeros';
import {Service} from '@sourceregistry/sveltekit-service-manager';
import {replaceCredential} from '$lib/server/repositories/device.repository';
import {getDeviceById, getDeviceCredentials, updateDeviceLastSeen} from '$lib/server/repositories/telemetry.repository';
import {getControllerSshPrivateKeyPath} from '$lib/server/security/controller-ssh-keys';
import {decryptSecret, encryptSecret} from '$lib/server/security/secrets';
import type {TaskDefinition} from '$lib/server/services/scheduler.service/types';
import {randomBytes} from 'node:crypto';

function generateSecret(length = 40): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_!@#%+=';
	const bytes = randomBytes(length);
	let out = '';

	for (let i = 0; i < length; i += 1) {
		out += chars[bytes[i] % chars.length];
	}

	return out;
}

function shellQuote(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function createRotateRestSecretTask(deviceId: string): TaskDefinition<{deviceId: string}> {
	let device: Awaited<ReturnType<typeof getDeviceById>>;
	let restCredential: Awaited<ReturnType<typeof getDeviceCredentials>>[number] | undefined;
	let managedCredential: Awaited<ReturnType<typeof getDeviceCredentials>>[number] | undefined;
	let previousSecret: string | null = null;
	let controllerPrivateKeyPath = '';
	const nextSecret = generateSecret();

	return {
		name: 'devices.credentials.rotate_rest_secret',
		deviceId,
		payload: {deviceId},
		failurePolicy: 'rollback',
		steps: [
			{
				name: 'Validate device and SSH trust',
				async execute() {
					device = await getDeviceById(deviceId);
					if (!device) {
						throw new Error(`Device ${deviceId} not found`);
					}

					const credentials = await getDeviceCredentials(device.id);
					restCredential = credentials.find((credential) => credential.purpose === 'read_only');
					managedCredential = credentials.find((credential) => credential.purpose === 'write');

					if (!restCredential?.secretEncrypted) {
						throw new Error(`Device ${deviceId} has no active REST credential`);
					}

					if (!managedCredential) {
						throw new Error(`Device ${deviceId} has no active SSH trust credential`);
					}

					controllerPrivateKeyPath = await getControllerSshPrivateKeyPath();
					previousSecret = decryptSecret(restCredential.secretEncrypted);

					return {
						message: 'Credential inputs are ready',
						data: {
							host: device.host,
							restUser: restCredential.username,
							managedUser: managedCredential.username
						}
					};
				}
			},
			{
				name: 'Rotate REST password on router',
				async execute() {
					if (!device || !restCredential || !managedCredential) {
						throw new Error('Credential validation step did not complete');
					}

					const ssh = new RouterOSSshClient({
						host: device.host,
						username: managedCredential.username,
						identityFile: controllerPrivateKeyPath,
						port: device.sshPort
					});

					await ssh.execute(
						`/user set [find where name=${shellQuote(restCredential.username)}] password=${shellQuote(nextSecret)}`
					);

					return {message: 'REST password rotated on router'};
				},
				async revert() {
					if (!device || !restCredential || !managedCredential || !previousSecret) {
						return {message: 'No previous REST password available'};
					}

					const ssh = new RouterOSSshClient({
						host: device.host,
						username: managedCredential.username,
						identityFile: controllerPrivateKeyPath,
						port: device.sshPort
					});

					await ssh.execute(
						`/user set [find where name=${shellQuote(restCredential.username)}] password=${shellQuote(previousSecret)}`
					);

					return {message: 'REST password reverted on router'};
				}
			},
			{
				name: 'Persist rotated REST credential',
				async execute() {
					if (!device || !restCredential) {
						throw new Error('Credential validation step did not complete');
					}

					await replaceCredential({
						deviceId: device.id,
						purpose: 'read_only',
						username: restCredential.username,
						secretEncrypted: encryptSecret(nextSecret)
					});

					await updateDeviceLastSeen(device.id);
					Service('devices').event.emit('device.updated', {
						siteId: device.siteId,
						deviceId: device.id,
						reason: 'credentials',
						connectionStatus: device.connectionStatus,
						timestamp: new Date().toISOString()
					});

					return {message: 'REST credential stored'};
				},
				async revert() {
					if (!device || !restCredential || !previousSecret) {
						return {message: 'No previous REST credential available'};
					}

					await replaceCredential({
						deviceId: device.id,
						purpose: 'read_only',
						username: restCredential.username,
						secretEncrypted: encryptSecret(previousSecret)
					});

					return {message: 'REST credential reverted in store'};
				}
			}
		]
	};
}
