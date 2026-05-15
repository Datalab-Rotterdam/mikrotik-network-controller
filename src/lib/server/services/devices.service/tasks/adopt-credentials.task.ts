import {JobRepository} from "$lib/server/repositories/job.repository";

import {
    type AdoptDeviceInput, assertSupportedAdoptionInventory,
    createCredentialAdoptionAttempt, failCredentialAdoption, finishCredentialAdoption, markCredentialAdoptionSyncing,
    readAdoptionInventory,
    type RouterOSInventory, storeAdoptionReadOnlyCredential, upsertAdoptionInventory
} from "$lib/server/services/devices.service/adoption";
import type {TaskDefinition} from "$lib/server/services/scheduler.service/types";
import {validateTcpPort} from "$lib/server/utilities/action-helpers";

export default (input: AdoptDeviceInput & { siteId: string | null }): TaskDefinition<{
    host: string;
    username: string;
    siteName: string;
    apiPort: number;
    platform: 'routeros' | 'switchos';
    requestedByUserId: string;
    siteId: string | null;
}> => {
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

                    const created = await createCredentialAdoptionAttempt(input);
                    attempt = created.attempt;
                    site = created.site;

                    return {
                        message: 'Adoption request is valid',
                        data: {
                            host: input.host,
                            platform: input.platform
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

                        await markCredentialAdoptionSyncing(attempt.id);
                        device = await upsertAdoptionInventory(input, site.id, inventory);
                        await JobRepository.update(context.jobId, { deviceId: device.id });

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
