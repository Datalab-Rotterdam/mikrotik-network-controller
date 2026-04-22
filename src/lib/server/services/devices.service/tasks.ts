import { randomBytes } from 'node:crypto';
import { RouterOSClient, RouterOSSshClient } from '@sourceregistry/mikrotik-client/routeros';
import { Service } from '@sourceregistry/sveltekit-service-manager';
import type { TaskDefinition } from '$lib/server/services/scheduler.service/types';
import { getDeviceById, getDeviceCredentials, updateDeviceLastSeen } from '$lib/server/repositories/telemetry.repository';
import { deleteDevice, replaceCredential, updateDeviceState } from '$lib/server/repositories/device.repository';
import { recordAuditEvent } from '$lib/server/repositories/audit.repository';
import { updateJob } from '$lib/server/repositories/job.repository';
import { decryptSecret, encryptSecret } from '$lib/server/security/secrets';
import { ensureControllerSshKeyPair, getControllerSshPrivateKeyPath } from '$lib/server/security/controller-ssh-keys';
import { emitDeviceRemoved, emitDeviceUpdated } from '$lib/server/services/device-events.service';
import {
	assertSupportedAdoptionInventory,
	createCredentialAdoptionAttempt,
	failCredentialAdoption,
	finishCredentialAdoption,
	markCredentialAdoptionSyncing,
	readAdoptionInventory,
	storeAdoptionReadOnlyCredential,
	type AdoptDeviceInput,
	type RouterOSInventory,
	upsertAdoptionInventory
} from '$lib/server/services/adoption.service';
import { generateBootstrapScript } from '$lib/server/services/router-provisioning.service';

const MANAGED_USER = 'mt-managed';
const REST_GROUP = 'controller-rest-group';
const REST_USER = 'controller-rest';
const CONTROLLER_PUBLIC_KEY_FILE = 'controller-managed.pub';

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

function resetCommandWasAccepted(error: unknown): boolean {
	const result = typeof error === 'object' && error && 'result' in error
		? (error as { result?: { stdout?: string; stderr?: string } }).result
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

function validateTcpPort(port: number): void {
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('API port must be a valid TCP port');
	}
}

function normalizeManagementCidrs(value: string | undefined): string {
	return (value ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
		.join(',');
}

function validateManagementCidrs(value: string): void {
	if (!value) {
		return;
	}

	const invalidToken = value.split(',').find((part) => !/^[0-9a-fA-F:.]+\/\d{1,3}$/.test(part));
	if (invalidToken) {
		throw new Error(`Invalid management CIDR: ${invalidToken}`);
	}
}

async function findRouterOsRecords(
	client: RouterOSClient,
	path: string,
	field: string,
	value: string
) {
	return client.print(path, {
		queries: [`?${field}=${value}`]
	});
}

async function removeRouterOsRecords(client: RouterOSClient, path: string, records: Array<Record<string, string>>) {
	for (const record of records) {
		if (record['.id']) {
			await client.execute(`${path}/remove`, {
				attributes: {
					'.id': record['.id']
				}
			});
		}
	}
}

async function upsertRouterOsGroup(client: RouterOSClient): Promise<void> {
	const policy = 'api,rest-api,read,write';
	const [existing] = await findRouterOsRecords(client, '/user/group', 'name', REST_GROUP);

	if (existing?.['.id']) {
		await client.execute('/user/group/set', {
			attributes: {
				'.id': existing['.id'],
				policy,
				comment: 'Managed by controller for external operations'
			}
		});
		return;
	}

	await client.execute('/user/group/add', {
		attributes: {
			name: REST_GROUP,
			policy,
			comment: 'Managed by controller for external operations'
		}
	});
}

async function upsertRouterOsUser(
	client: RouterOSClient,
	input: {
		name: string;
		group: string;
		comment: string;
		password?: string;
		managementCidrs: string;
	}
): Promise<void> {
	const [existing] = await findRouterOsRecords(client, '/user', 'name', input.name);
	const attributes: Record<string, string> = {
		name: input.name,
		group: input.group,
		comment: input.comment,
		address: input.managementCidrs
	};

	if (input.password !== undefined) {
		attributes.password = input.password;
	}

	if (existing?.['.id']) {
		await client.execute('/user/set', {
			attributes: {
				'.id': existing['.id'],
				...attributes
			}
		});
		return;
	}

	await client.execute('/user/add', {
		attributes
	});
}

async function importControllerPublicKey(client: RouterOSClient, publicKey: string): Promise<void> {
	const existingFiles = await findRouterOsRecords(client, '/file', 'name', CONTROLLER_PUBLIC_KEY_FILE);
	await removeRouterOsRecords(client, '/file', existingFiles);

	await client.execute('/file/add', {
		attributes: {
			name: CONTROLLER_PUBLIC_KEY_FILE,
			contents: publicKey
		}
	});

	const existingKeys = await findRouterOsRecords(client, '/user/ssh-keys', 'user', MANAGED_USER);
	await removeRouterOsRecords(client, '/user/ssh-keys', existingKeys);

	try {
		await client.execute('/user/ssh-keys/import', {
			attributes: {
				user: MANAGED_USER,
				'public-key-file': CONTROLLER_PUBLIC_KEY_FILE
			}
		});
	} finally {
		const importedFiles = await findRouterOsRecords(client, '/file', 'name', CONTROLLER_PUBLIC_KEY_FILE);
		await removeRouterOsRecords(client, '/file', importedFiles);
	}
}

async function setRouterOsService(
	client: RouterOSClient,
	name: string,
	attributes: Record<string, string | boolean>
): Promise<void> {
	const [service] = await findRouterOsRecords(client, '/ip/service', 'name', name);

	if (!service?.['.id']) {
		return;
	}

	await client.execute('/ip/service/set', {
		attributes: {
			'.id': service['.id'],
			...attributes
		}
	});
}

async function hardenManagedServices(client: RouterOSClient, managementCidrs: string): Promise<void> {
	await setRouterOsService(client, 'ssh', {
		disabled: false,
		address: managementCidrs
	});
	await setRouterOsService(client, 'www', { disabled: true });
	await setRouterOsService(client, 'www-ssl', {
		disabled: false,
		address: managementCidrs
	});
	await setRouterOsService(client, 'api', {
		disabled: false,
		address: managementCidrs
	});
	await setRouterOsService(client, 'api-ssl', {
		disabled: false,
		address: managementCidrs
	});
}

export function createAdoptCredentialsTask(input: AdoptDeviceInput & { siteId: string | null }): TaskDefinition<{
	host: string;
	username: string;
	siteName: string;
	apiPort: number;
	provider: 'real' | 'mock';
	platform: 'routeros' | 'switchos';
	requestedByUserId: string;
	siteId: string | null;
}> {
	let attempt: Awaited<ReturnType<typeof createCredentialAdoptionAttempt>>['attempt'] | undefined;
	let site: Awaited<ReturnType<typeof createCredentialAdoptionAttempt>>['site'] | undefined;
	let inventory: RouterOSInventory | undefined;
	let device: Awaited<ReturnType<typeof upsertAdoptionInventory>> | undefined;

	async function recordFailure(error: unknown): Promise<void> {
		if (attempt) {
			await failCredentialAdoption(input, attempt.id, error);
		}
	}

	return {
		name: 'devices.adopt.credentials',
		siteId: input.siteId,
		requestedByUserId: input.requestedByUserId,
		payload: {
			host: input.host,
			username: input.username,
			siteName: input.siteName,
			apiPort: input.apiPort,
			provider: input.provider,
			platform: input.platform,
			requestedByUserId: input.requestedByUserId,
			siteId: input.siteId
		},
		failurePolicy: 'stop',
		steps: [
			{
				name: 'Validate adoption request',
				async execute() {
					if (!input.host || !input.username || !input.password) {
						throw new Error('Host, username, and password are required');
					}

					validateTcpPort(input.apiPort);

					if (input.platform !== 'routeros' && input.platform !== 'switchos') {
						throw new Error('Unknown device platform');
					}

					if (input.provider !== 'real' && input.provider !== 'mock') {
						throw new Error('Unknown adoption provider');
					}

					const created = await createCredentialAdoptionAttempt(input);
					attempt = created.attempt;
					site = created.site;

					return {
						message: 'Adoption request is valid',
						data: {
							host: input.host,
							platform: input.platform,
							provider: input.provider
						}
					};
				}
			},
			{
				name: 'Validate credentials and reachability',
				async execute() {
					try {
						if (!attempt) {
							throw new Error('Adoption request validation did not complete');
						}

						inventory = await readAdoptionInventory(input);
						assertSupportedAdoptionInventory(input, inventory);

						return {
							message: 'Credentials accepted',
							data: {
								identity: inventory.identity,
								version: inventory.version,
								model: inventory.model
							}
						};
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			},
			{
				name: 'Sync inventory and interfaces',
				async execute(context) {
					try {
						if (!attempt || !site || !inventory) {
							throw new Error('Credential validation did not complete');
						}

						await markCredentialAdoptionSyncing(attempt.id, input.provider);
						device = await upsertAdoptionInventory(input, site.id, inventory);
						await updateJob(context.jobId, { deviceId: device.id });

						return {
							message: 'Inventory synced',
							data: {
								deviceId: device.id,
								interfaceCount: inventory.interfaces.length
							}
						};
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			},
			{
				name: 'Store read-only credential',
				async execute() {
					try {
						if (!device) {
							throw new Error('Inventory sync did not complete');
						}

						await storeAdoptionReadOnlyCredential(input, device.id);

						return { message: 'Read-only credential stored' };
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			},
			{
				name: 'Mark device adopted',
				async execute() {
					try {
						if (!attempt || !site || !inventory || !device) {
							throw new Error('Credential storage did not complete');
						}

						await finishCredentialAdoption(input, {
							attemptId: attempt.id,
							device,
							site,
							inventory
						});

						return {
							message: `${device.identity ?? device.name} adopted in read-only mode`,
							data: {
								deviceId: device.id,
								siteId: site.id
							}
						};
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			}
		]
	};
}

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

export function createManagedAdoptCredentialsTask(input: AdoptDeviceInput & {
	siteId: string | null;
	managementCidrs?: string;
}): TaskDefinition<{
	host: string;
	username: string;
	siteName: string;
	apiPort: number;
	provider: 'real' | 'mock';
	platform: 'routeros' | 'switchos';
	requestedByUserId: string;
	siteId: string | null;
	managementCidrs?: string;
}> {
	let attempt: Awaited<ReturnType<typeof createCredentialAdoptionAttempt>>['attempt'] | undefined;
	let site: Awaited<ReturnType<typeof createCredentialAdoptionAttempt>>['site'] | undefined;
	let inventory: RouterOSInventory | undefined;
	let device: Awaited<ReturnType<typeof upsertAdoptionInventory>> | undefined;
	let restPassword = '';
	let managedUserPassword = '';
	let managementCidrs = '';

	async function recordFailure(error: unknown): Promise<void> {
		if (attempt) {
			await failCredentialAdoption(input, attempt.id, error);
		}
	}

	return {
		name: 'devices.adopt.managed_credentials',
		siteId: input.siteId,
		requestedByUserId: input.requestedByUserId,
		payload: {
			host: input.host,
			username: input.username,
			siteName: input.siteName,
			apiPort: input.apiPort,
			provider: input.provider,
			platform: input.platform,
			requestedByUserId: input.requestedByUserId,
			siteId: input.siteId,
			managementCidrs: input.managementCidrs
		},
		failurePolicy: 'stop',
		steps: [
			{
				name: 'Validate managed adoption request',
				async execute() {
					if (!input.host || !input.username) {
						throw new Error('Host and username are required');
					}

					validateTcpPort(input.apiPort);

					if (input.platform !== 'routeros') {
						throw new Error('Managed adoption requires a RouterOS device');
					}

					if (input.provider !== 'real') {
						throw new Error('Managed adoption requires the real RouterOS API provider');
					}

					managementCidrs = normalizeManagementCidrs(input.managementCidrs);
					validateManagementCidrs(managementCidrs);

					const created = await createCredentialAdoptionAttempt(input, 'managed');
					attempt = created.attempt;
					site = created.site;

					return {
						message: 'Managed adoption request is valid',
						data: {
							host: input.host,
							managementRestricted: Boolean(managementCidrs)
						}
					};
				}
			},
			{
				name: 'Validate credentials and sync inventory',
				async execute(context) {
					try {
						if (!attempt || !site) {
							throw new Error('Managed adoption validation did not complete');
						}

						inventory = await readAdoptionInventory(input);
						assertSupportedAdoptionInventory(input, inventory);
						await markCredentialAdoptionSyncing(attempt.id, input.provider);
						device = await upsertAdoptionInventory(input, site.id, inventory);
						await updateJob(context.jobId, { deviceId: device.id });

						return {
							message: 'Inventory synced',
							data: {
								deviceId: device.id,
								identity: inventory.identity,
								interfaceCount: inventory.interfaces.length
							}
						};
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			},
			{
				name: 'Install controller managed credentials',
				async execute() {
					try {
						if (!device) {
							throw new Error('Inventory sync did not complete');
						}

						const keyPair = await ensureControllerSshKeyPair();
						restPassword = generateSecret();
						managedUserPassword = generateSecret();
						const client = new RouterOSClient({
							host: input.host,
							port: input.apiPort,
							username: input.username,
							password: input.password,
							timeoutMs: 10_000
						});

						try {
							await client.login();
							await upsertRouterOsGroup(client);
							await upsertRouterOsUser(client, {
								name: REST_USER,
								group: REST_GROUP,
								password: restPassword,
								comment: 'External controller API account',
								managementCidrs
							});
							await upsertRouterOsUser(client, {
								name: MANAGED_USER,
								group: 'full',
								password: managedUserPassword,
								comment: 'External controller SSH trust anchor',
								managementCidrs
							});
							await importControllerPublicKey(client, keyPair.publicKey);
							await hardenManagedServices(client, managementCidrs);

							return {
								message: 'Managed controller credentials installed',
								data: {
									restUser: REST_USER,
									managedUser: MANAGED_USER
								}
							};
						} finally {
							await client.close();
						}
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			},
			{
				name: 'Store managed credentials',
				async execute() {
					try {
						if (!device || !restPassword) {
							throw new Error('Managed credential installation did not complete');
						}

						await replaceCredential({
							deviceId: device.id,
							purpose: 'read_only',
							username: REST_USER,
							secretEncrypted: encryptSecret(restPassword)
						});

						await replaceCredential({
							deviceId: device.id,
							purpose: 'write',
							username: MANAGED_USER,
							secretEncrypted: encryptSecret('ssh-key:controller')
						});

						await updateDeviceState(device.id, {
							adoptionMode: 'managed',
							adoptionState: 'fully_managed',
							connectionStatus: 'online'
						});
						await updateDeviceLastSeen(device.id);
						await emitDeviceUpdated(device.id, 'adoption');

						return { message: 'Managed credentials stored' };
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			},
			{
				name: 'Schedule provisioning',
				async execute() {
					try {
						if (!attempt || !site || !inventory || !device) {
							throw new Error('Managed credential storage did not complete');
						}

						await finishCredentialAdoption(input, {
							attemptId: attempt.id,
							device,
							site,
							inventory,
							mode: 'managed'
						});

						const provisioningTask = await Service('scheduler').schedule(createProvisionDeviceTask(device.id));

						return {
							message: 'Provisioning scheduled',
							data: {
								deviceId: device.id,
								provisioningJobId: provisioningTask.id
							}
						};
					} catch (error) {
						await recordFailure(error);
						throw error;
					}
				}
			}
		]
	};
}

export function createProvisionDeviceTask(deviceId: string): TaskDefinition<{ deviceId: string }> {
	let device: Awaited<ReturnType<typeof getDeviceById>>;
	let restCredential: Awaited<ReturnType<typeof getDeviceCredentials>>[number] | undefined;
	let previousIdentity: string | null = null;

	return {
		name: 'devices.provision',
		deviceId,
		payload: { deviceId },
		failurePolicy: 'rollback',
		steps: [
			{
				name: 'Validate device and REST access',
				async execute() {
					device = await getDeviceById(deviceId);
					if (!device) {
						throw new Error(`Device ${deviceId} not found`);
					}

					const credentials = await getDeviceCredentials(device.id);
					restCredential = credentials.find((credential) => credential.purpose === 'read_only');

					if (!restCredential?.secretEncrypted) {
						throw new Error(`Device ${deviceId} is not ready for provisioning`);
					}

					previousIdentity = device.identity ?? device.name;

					return {
						message: 'Device and REST credential are ready',
						data: {
							host: device.host,
							identity: previousIdentity
						}
					};
				}
			},
			{
				name: 'Apply controller identity',
				async execute() {
					if (!device || !restCredential) {
						throw new Error('Provisioning validation step did not complete');
					}

					const client = new RouterOSClient({
						host: device.host,
						port: device.apiPort,
						username: restCredential.username,
						password: decryptSecret(restCredential.secretEncrypted)
					});

					try {
						const nextIdentity = `device-${device.id}`;
						await client.system.identity.set(nextIdentity);

						return {
							message: 'Router identity updated',
							data: { identity: nextIdentity }
						};
					} finally {
						await client.close();
					}
				},
				async revert() {
					if (!device || !restCredential || !previousIdentity) {
						return { message: 'No previous identity available' };
					}

					const client = new RouterOSClient({
						host: device.host,
						port: device.apiPort,
						username: restCredential.username,
						password: decryptSecret(restCredential.secretEncrypted)
					});

					try {
						await client.system.identity.set(previousIdentity);

						return {
							message: 'Router identity reverted',
							data: { identity: previousIdentity }
						};
					} finally {
						await client.close();
					}
				}
			},
			{
				name: 'Verify telemetry path',
				async execute() {
					if (!device || !restCredential) {
						throw new Error('Provisioning validation step did not complete');
					}

					const client = new RouterOSClient({
						host: device.host,
						port: device.apiPort,
						username: restCredential.username,
						password: decryptSecret(restCredential.secretEncrypted)
					});

					try {
						const resource = await client.system.resource.get();
						await updateDeviceLastSeen(device.id);
						await emitDeviceUpdated(device.id, 'telemetry');

						return {
							message: 'Telemetry path verified',
							data: { resource }
						};
					} finally {
						await client.close();
					}
				}
			}
		]
	};
}

export function createRotateRestSecretTask(deviceId: string): TaskDefinition<{ deviceId: string }> {
	let device: Awaited<ReturnType<typeof getDeviceById>>;
	let restCredential: Awaited<ReturnType<typeof getDeviceCredentials>>[number] | undefined;
	let managedCredential: Awaited<ReturnType<typeof getDeviceCredentials>>[number] | undefined;
	let previousSecret: string | null = null;
	let controllerPrivateKeyPath = '';
	const nextSecret = generateSecret();

	return {
		name: 'devices.credentials.rotate_rest_secret',
		deviceId,
		payload: { deviceId },
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

					return { message: 'REST password rotated on router' };
				},
				async revert() {
					if (!device || !restCredential || !managedCredential || !previousSecret) {
						return { message: 'No previous REST password available' };
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

					return { message: 'REST password reverted on router' };
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
					await emitDeviceUpdated(device.id, 'credentials');

					return { message: 'REST credential stored' };
				},
				async revert() {
					if (!device || !restCredential || !previousSecret) {
						return { message: 'No previous REST credential available' };
					}

					await replaceCredential({
						deviceId: device.id,
						purpose: 'read_only',
						username: restCredential.username,
						secretEncrypted: encryptSecret(previousSecret)
					});

					return { message: 'REST credential reverted in store' };
				}
			}
		]
	};
}

export function createRemoveDeviceTask(input: {
	deviceId: string;
	siteId: string | null;
	requestedByUserId: string;
}): TaskDefinition<{ deviceId: string; siteId: string | null }> {
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
						emitDeviceRemoved({
							siteId: device.siteId,
							deviceId: device.id
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
