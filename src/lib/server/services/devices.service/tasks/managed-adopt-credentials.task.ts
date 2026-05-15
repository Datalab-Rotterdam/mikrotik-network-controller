import {DeviceRepository} from "$lib/server/repositories/device.repository";
import {JobRepository} from "$lib/server/repositories/job.repository";
import {TelemetryRepository} from "$lib/server/repositories/telemetry.repository";
import {ensureControllerSshKeyPair} from "$lib/server/security/controller-ssh-keys";
import {encryptSecret, generateRandomSecret} from "$lib/server/security/secrets";
import {emitDeviceUpdated} from "$lib/server/services/devices.service/events";
import provisionDeviceTask from "$lib/server/services/devices.service/tasks/provision-device.task";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";
import {validateTcpPort} from "$lib/server/utilities/action-helpers";
import {RouterOSClient} from "@sourceregistry/mikrotik-client/routeros";
import {Service} from "@sourceregistry/sveltekit-service-manager/server";
import {
    type AdoptDeviceInput, assertSupportedAdoptionInventory,
    createCredentialAdoptionAttempt,
    failCredentialAdoption, finishCredentialAdoption, markCredentialAdoptionSyncing, readAdoptionInventory,
    type RouterOSInventory,
    upsertAdoptionInventory
} from "../adoption";



const MANAGED_USER = 'mt-managed';
const REST_GROUP = 'controller-rest-group';
const REST_USER = 'controller-rest';
const CONTROLLER_PUBLIC_KEY_FILE = 'controller-managed.pub';


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


export default (input: AdoptDeviceInput & {
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
}> => {
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
                        assertSupportedAdoptionInventory(input, inventory);
                        await markCredentialAdoptionSyncing(attempt.id);
                        device = await upsertAdoptionInventory(input, site.id, inventory);
                        await JobRepository.update(context.jobId, { deviceId: device.id });

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
                        restPassword = generateRandomSecret();
                        managedUserPassword = generateRandomSecret();
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

                        await DeviceRepository.replaceCredential({
                            deviceId: device.id,
                            purpose: 'read_only',
                            username: REST_USER,
                            secretEncrypted: encryptSecret(restPassword)
                        });

                        await DeviceRepository.replaceCredential({
                            deviceId: device.id,
                            purpose: 'write',
                            username: MANAGED_USER,
                            secretEncrypted: encryptSecret('ssh-key:controller')
                        });

                        await DeviceRepository.updateState(device.id, {
                            adoptionMode: 'managed',
                            adoptionState: 'fully_managed',
                            connectionStatus: 'online'
                        });
                        await TelemetryRepository.updateLastSeen(device.id);
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

                        const provisioningTask = await Service('scheduler').schedule(provisionDeviceTask(device.id));

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
