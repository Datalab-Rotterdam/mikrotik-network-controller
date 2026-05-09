import {randomBytes} from 'node:crypto';
import {RouterOSClient} from '@sourceregistry/mikrotik-client/routeros';
import {Service} from '@sourceregistry/sveltekit-service-manager';
import {replaceCredential, updateDeviceState} from '$lib/server/repositories/device.repository';
import {updateDeviceLastSeen} from '$lib/server/repositories/telemetry.repository';
import {ensureControllerSshKeyPair} from '$lib/server/security/controller-ssh-keys';
import {encryptSecret} from '$lib/server/security/secrets';
import type {TaskDefinition} from '$lib/server/services/scheduler.service/types';
import {createProvisionDeviceTask} from '../../provisioning/tasks';
import {
	createCredentialAdoptionAttempt,
	failCredentialAdoption,
	finishCredentialAdoption,
	readAdoptionInventory,
	syncCredentialAdoptionInventory,
	type AdoptDeviceInput,
	type RouterOSInventory
} from './shared';

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

function validateTcpPort(port: number): void {
	if (!Number.isInteger(port) || port < 1 || port > 65_535) {
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

async function installManagedRouterOsCredentials(input: {
	host: string;
	apiPort: number;
	username: string;
	password: string;
	managementCidrs: string;
}) {
	const keyPair = await ensureControllerSshKeyPair();
	const restPassword = generateSecret();
	const managedUserPassword = generateSecret();
	const client = new RouterOSClient({
		host: input.host,
		port: input.apiPort,
		username: input.username,
		password: input.password,
		timeoutMs: 10_000
	});

	const findRecords = (path: string, field: string, value: string) =>
		client.print(path, {queries: [`?${field}=${value}`]});

	const removeRecords = async (path: string, records: Array<Record<string, string>>) => {
		for (const record of records) {
			if (record['.id']) {
				await client.execute(`${path}/remove`, {
					attributes: {
						'.id': record['.id']
					}
				});
			}
		}
	};

	const upsertUser = async (definition: {
		name: string;
		group: string;
		comment: string;
		password?: string;
	}) => {
		const [existing] = await findRecords('/user', 'name', definition.name);
		const attributes: Record<string, string> = {
			name: definition.name,
			group: definition.group,
			comment: definition.comment,
			address: input.managementCidrs
		};

		if (definition.password !== undefined) {
			attributes.password = definition.password;
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

		await client.execute('/user/add', {attributes});
	};

	const setService = async (name: string, attributes: Record<string, string | boolean>) => {
		const [service] = await findRecords('/ip/service', 'name', name);
		if (!service?.['.id']) {
			return;
		}

		await client.execute('/ip/service/set', {
			attributes: {
				'.id': service['.id'],
				...attributes
			}
		});
	};

	try {
		await client.login();

		const [existingGroup] = await findRecords('/user/group', 'name', REST_GROUP);
		const policy = 'api,rest-api,read,write';
		if (existingGroup?.['.id']) {
			await client.execute('/user/group/set', {
				attributes: {
					'.id': existingGroup['.id'],
					policy,
					comment: 'Managed by controller for external operations'
				}
			});
		} else {
			await client.execute('/user/group/add', {
				attributes: {
					name: REST_GROUP,
					policy,
					comment: 'Managed by controller for external operations'
				}
			});
		}

		await upsertUser({
			name: REST_USER,
			group: REST_GROUP,
			password: restPassword,
			comment: 'External controller API account'
		});
		await upsertUser({
			name: MANAGED_USER,
			group: 'full',
			password: managedUserPassword,
			comment: 'External controller SSH trust anchor'
		});

		const existingFiles = await findRecords('/file', 'name', CONTROLLER_PUBLIC_KEY_FILE);
		await removeRecords('/file', existingFiles);
		await client.execute('/file/add', {
			attributes: {
				name: CONTROLLER_PUBLIC_KEY_FILE,
				contents: keyPair.publicKey
			}
		});

		const existingKeys = await findRecords('/user/ssh-keys', 'user', MANAGED_USER);
		await removeRecords('/user/ssh-keys', existingKeys);

		try {
			await client.execute('/user/ssh-keys/import', {
				attributes: {
					user: MANAGED_USER,
					'public-key-file': CONTROLLER_PUBLIC_KEY_FILE
				}
			});
		} finally {
			const importedFiles = await findRecords('/file', 'name', CONTROLLER_PUBLIC_KEY_FILE);
			await removeRecords('/file', importedFiles);
		}

		await setService('ssh', {
			disabled: false,
			address: input.managementCidrs
		});
		await setService('www', {disabled: true});
		await setService('www-ssl', {
			disabled: false,
			address: input.managementCidrs
		});
		await setService('api', {
			disabled: false,
			address: input.managementCidrs
		});
		await setService('api-ssl', {
			disabled: false,
			address: input.managementCidrs
		});

		return {
			restPassword,
			managedUserPassword,
			restUser: REST_USER,
			managedUser: MANAGED_USER
		};
	} finally {
		await client.close();
	}
}

export function createManagedAdoptCredentialsTask(input: AdoptDeviceInput & {
	siteId: string | null;
	managementCidrs?: string;
}): TaskDefinition<{
	host: string;
	username: string;
	siteName: string;
	apiPort: number;
	platform: 'routeros' | 'switchos';
	requestedByUserId: string;
	siteId: string | null;
	managementCidrs?: string;
}> {
	let attempt: Awaited<ReturnType<typeof createCredentialAdoptionAttempt>>['attempt'] | undefined;
	let site: Awaited<ReturnType<typeof createCredentialAdoptionAttempt>>['site'] | undefined;
	let inventory: RouterOSInventory | undefined;
	let device: Awaited<ReturnType<typeof syncCredentialAdoptionInventory>> | undefined;
	let restPassword = '';
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
						device = await syncCredentialAdoptionInventory({
							adoption: input,
							attemptId: attempt.id,
							siteId: site.id,
							inventory,
							jobId: context.jobId
						});

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

						const installed = await installManagedRouterOsCredentials({
							host: input.host,
							apiPort: input.apiPort,
							username: input.username,
							password: input.password,
							managementCidrs
						});
						restPassword = installed.restPassword;

						return {
							message: 'Managed controller credentials installed',
							data: {
								restUser: installed.restUser,
								managedUser: installed.managedUser
							}
						};
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
						Service('devices').event.emit('device.updated', {
							siteId: device.siteId,
							deviceId: device.id,
							reason: 'adoption',
							connectionStatus: 'online',
							timestamp: new Date().toISOString()
						});

						return {message: 'Managed credentials stored'};
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
