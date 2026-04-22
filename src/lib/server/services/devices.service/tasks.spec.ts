import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StepExecutionContext } from '$lib/server/services/scheduler.service/types';

const mocks = vi.hoisted(() => ({
	getDeviceById: vi.fn(),
	getDeviceCredentials: vi.fn(),
	updateDeviceLastSeen: vi.fn(),
	deleteDevice: vi.fn(),
	replaceCredential: vi.fn(),
	updateDeviceState: vi.fn(),
	emitDeviceUpdated: vi.fn(),
	emitDeviceRemoved: vi.fn(),
	recordAuditEvent: vi.fn(),
	updateJob: vi.fn(),
	createCredentialAdoptionAttempt: vi.fn(),
	readAdoptionInventory: vi.fn(),
	assertSupportedAdoptionInventory: vi.fn(),
	markCredentialAdoptionSyncing: vi.fn(),
	upsertAdoptionInventory: vi.fn(),
	storeAdoptionReadOnlyCredential: vi.fn(),
	finishCredentialAdoption: vi.fn(),
	failCredentialAdoption: vi.fn(),
	ensureControllerSshKeyPair: vi.fn(),
	getControllerSshPrivateKeyPath: vi.fn(),
	schedulerSchedule: vi.fn(),
	routerOsLogin: vi.fn(),
	routerOsExecute: vi.fn(),
	routerOsPrint: vi.fn(),
	routerOsIdentitySet: vi.fn(),
	routerOsResourceGet: vi.fn(),
	routerOsClose: vi.fn(),
	sshExecute: vi.fn()
}));

vi.mock('$lib/server/repositories/telemetry.repository', () => ({
	getDeviceById: mocks.getDeviceById,
	getDeviceCredentials: mocks.getDeviceCredentials,
	updateDeviceLastSeen: mocks.updateDeviceLastSeen
}));

vi.mock('$lib/server/repositories/device.repository', () => ({
	deleteDevice: mocks.deleteDevice,
	replaceCredential: mocks.replaceCredential,
	updateDeviceState: mocks.updateDeviceState
}));

vi.mock('$lib/server/services/device-events.service', () => ({
	emitDeviceUpdated: mocks.emitDeviceUpdated,
	emitDeviceRemoved: mocks.emitDeviceRemoved
}));

vi.mock('$lib/server/repositories/audit.repository', () => ({
	recordAuditEvent: mocks.recordAuditEvent
}));

vi.mock('$lib/server/repositories/job.repository', () => ({
	updateJob: mocks.updateJob
}));

vi.mock('$lib/server/security/secrets', () => ({
	decryptSecret: (value: string) => value,
	encryptSecret: (value: string) => value
}));

vi.mock('$lib/server/security/controller-ssh-keys', () => ({
	ensureControllerSshKeyPair: mocks.ensureControllerSshKeyPair,
	getControllerSshPrivateKeyPath: mocks.getControllerSshPrivateKeyPath
}));

vi.mock('@sourceregistry/sveltekit-service-manager', () => ({
	Service: vi.fn(() => ({
		schedule: mocks.schedulerSchedule
	}))
}));

vi.mock('$lib/server/services/adoption.service', () => ({
	createCredentialAdoptionAttempt: mocks.createCredentialAdoptionAttempt,
	readAdoptionInventory: mocks.readAdoptionInventory,
	assertSupportedAdoptionInventory: mocks.assertSupportedAdoptionInventory,
	markCredentialAdoptionSyncing: mocks.markCredentialAdoptionSyncing,
	upsertAdoptionInventory: mocks.upsertAdoptionInventory,
	storeAdoptionReadOnlyCredential: mocks.storeAdoptionReadOnlyCredential,
	finishCredentialAdoption: mocks.finishCredentialAdoption,
	failCredentialAdoption: mocks.failCredentialAdoption
}));

vi.mock('@sourceregistry/mikrotik-client/routeros', () => ({
	RouterOSClient: vi.fn().mockImplementation(function RouterOSClient() {
		return {
			system: {
				identity: {
					set: mocks.routerOsIdentitySet
				},
				resource: {
					get: mocks.routerOsResourceGet
				}
			},
			login: mocks.routerOsLogin,
			execute: mocks.routerOsExecute,
			print: mocks.routerOsPrint,
			close: mocks.routerOsClose
		};
	}),
	RouterOSSshClient: vi.fn().mockImplementation(function RouterOSSshClient() {
		return {
			execute: mocks.sshExecute
		};
	})
}));

const {
	createAdoptCredentialsTask,
	createManagedAdoptCredentialsTask,
	createPrepareBootstrapTask,
	createProvisionDeviceTask,
	createRotateRestSecretTask,
	createRemoveDeviceTask
} = await import('./tasks');

const context: StepExecutionContext<{ deviceId: string; siteId: string | null }> = {
	jobId: 'job-1',
	payload: {
		deviceId: 'device-1',
		siteId: 'site-1'
	},
	stepId: 'step-1',
	stepIndex: 0,
	stepName: 'Test step',
	emit: vi.fn()
};

function makeStepContext<TPayload extends Record<string, unknown>>(
	payload: TPayload,
	jobId = 'job-adopt-1'
): StepExecutionContext<TPayload> {
	return {
		jobId,
		payload,
		stepId: 'step-1',
		stepIndex: 0,
		stepName: 'Test step',
		emit: vi.fn()
	};
}

function makeDevice(patch: Record<string, unknown> = {}) {
	return {
		id: 'device-1',
		siteId: 'site-1',
		name: 'Router 1',
		platform: 'routeros',
		adoptionMode: 'managed',
		adoptionState: 'fully_managed',
		connectionStatus: 'online',
		host: '192.0.2.1',
		apiPort: 8728,
		sshPort: 22,
		identity: 'router-1',
		model: 'hEX',
		serialNumber: 'ABC123',
		routerOsVersion: '7.18.2',
		architecture: 'arm',
		uptimeSeconds: 100,
		capabilities: [],
		tags: [],
		lastSeenAt: new Date(),
		lastSyncAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
		...patch
	};
}

function makeWriteCredential() {
	return {
		id: 'credential-1',
		deviceId: 'device-1',
		purpose: 'write',
		username: 'mt-managed',
		secretEncrypted: 'ssh-key:controller',
		isActive: true,
		lastValidatedAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

function makeReadOnlyCredential() {
	return {
		id: 'credential-read-1',
		deviceId: 'device-1',
		purpose: 'read_only',
		username: 'controller-rest',
		secretEncrypted: 'v1:raw-secret-for-tests',
		isActive: true,
		lastValidatedAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getDeviceById.mockResolvedValue(makeDevice());
	mocks.getDeviceCredentials.mockResolvedValue([makeWriteCredential()]);
	mocks.schedulerSchedule.mockResolvedValue({ id: 'job-provision-1' });
	mocks.ensureControllerSshKeyPair.mockResolvedValue({
		privateKeyPath: '/tmp/controller-key',
		publicKeyPath: '/tmp/controller-key.pub',
		publicKey: 'ssh-rsa AAAATEST controller@test'
	});
	mocks.getControllerSshPrivateKeyPath.mockResolvedValue('/tmp/controller-key');
	mocks.updateJob.mockResolvedValue({});
	mocks.updateDeviceState.mockResolvedValue({});
	mocks.createCredentialAdoptionAttempt.mockResolvedValue({
		site: { id: 'site-1', name: 'Default' },
		attempt: { id: 'attempt-1' }
	});
	mocks.readAdoptionInventory.mockResolvedValue({
		identity: 'router-1',
		version: '7.18.2',
		model: 'hEX',
		interfaces: []
	});
	mocks.upsertAdoptionInventory.mockResolvedValue(makeDevice());
	mocks.routerOsIdentitySet.mockResolvedValue(undefined);
	mocks.routerOsLogin.mockResolvedValue(undefined);
	mocks.routerOsExecute.mockResolvedValue({ records: [], traps: [], tag: 'tag-1' });
	mocks.routerOsPrint.mockImplementation((path: string, options?: { queries?: string[] }) => {
		if (path === '/ip/service') {
			const name = options?.queries?.[0]?.replace('?name=', '') ?? 'service';
			return Promise.resolve([{ '.id': `*${name}`, name }]);
		}

		return Promise.resolve([]);
	});
	mocks.routerOsResourceGet.mockResolvedValue({ version: '7.18.2' });
	mocks.routerOsClose.mockResolvedValue(undefined);
	mocks.sshExecute.mockResolvedValue({
		command: '/system reset-configuration skip-backup=yes',
		stdout: '',
		stderr: '',
		exitCode: 0,
		signal: null
	});
});

describe('createProvisionDeviceTask', () => {
	it('sets the singleton RouterOS identity without an item id', async () => {
		mocks.getDeviceCredentials.mockResolvedValue([makeReadOnlyCredential()]);
		const task = createProvisionDeviceTask('device-1');

		await task.steps[0].execute(makeStepContext({ deviceId: 'device-1' }));
		await task.steps[1].execute(makeStepContext({ deviceId: 'device-1' }));

		expect(mocks.routerOsIdentitySet).toHaveBeenCalledWith('device-device-1');
		expect(mocks.routerOsIdentitySet).not.toHaveBeenCalledWith(
			expect.objectContaining({ '.id': expect.anything() })
		);
	});

	it('reverts the singleton RouterOS identity without an item id', async () => {
		mocks.getDeviceCredentials.mockResolvedValue([makeReadOnlyCredential()]);
		const task = createProvisionDeviceTask('device-1');

		await task.steps[0].execute(makeStepContext({ deviceId: 'device-1' }));
		await task.steps[1].revert?.(makeStepContext({ deviceId: 'device-1' }));

		expect(mocks.routerOsIdentitySet).toHaveBeenCalledWith('router-1');
	});
});

describe('createRemoveDeviceTask', () => {
	it('fails validation when the device is missing', async () => {
		mocks.getDeviceById.mockResolvedValue(null);
		const task = createRemoveDeviceTask({
			deviceId: 'device-1',
			siteId: 'site-1',
			requestedByUserId: 'user-1'
		});

		await expect(task.steps[0].execute(context)).rejects.toThrow('Device device-1 not found');
		expect(mocks.deleteDevice).not.toHaveBeenCalled();
	});

	it('fails validation when the managed SSH credential is missing', async () => {
		mocks.getDeviceCredentials.mockResolvedValue([]);
		const task = createRemoveDeviceTask({
			deviceId: 'device-1',
			siteId: 'site-1',
			requestedByUserId: 'user-1'
		});

		await expect(task.steps[0].execute(context)).rejects.toThrow('no active SSH trust credential');
		expect(mocks.deleteDevice).not.toHaveBeenCalled();
	});

	it('fails validation when controller SSH key material cannot be prepared', async () => {
		mocks.getControllerSshPrivateKeyPath.mockRejectedValue(new Error('openssl unavailable'));
		const task = createRemoveDeviceTask({
			deviceId: 'device-1',
			siteId: 'site-1',
			requestedByUserId: 'user-1'
		});

		await expect(task.steps[0].execute(context)).rejects.toThrow('openssl unavailable');
		expect(mocks.deleteDevice).not.toHaveBeenCalled();
	});

	it('resets the device before deleting controller records', async () => {
		const task = createRemoveDeviceTask({
			deviceId: 'device-1',
			siteId: 'site-1',
			requestedByUserId: 'user-1'
		});

		await task.steps[0].execute(context);
		await task.steps[1].execute(context);
		await task.steps[2].execute(context);

		expect(mocks.sshExecute).toHaveBeenCalledWith('/system reset-configuration', {
			attributes: {
				'skip-backup': true
			},
			stdin: 'y\n',
			timeoutMs: 15_000
		});
		expect(mocks.deleteDevice).toHaveBeenCalledWith('device-1');
		expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'device.removed.reset',
				targetDeviceId: 'device-1'
			})
		);
	});
});

describe('createAdoptCredentialsTask', () => {
	it('fails validation when credentials are missing', async () => {
		const payload = {
			host: '192.0.2.1',
			username: '',
			siteName: 'Default',
			apiPort: 8728,
			provider: 'real' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1'
		};
		const task = createAdoptCredentialsTask({
			...payload,
			password: '',
		});

		await expect(task.steps[0].execute(makeStepContext(payload))).rejects.toThrow(
			'Host, username, and password are required'
		);
		expect(mocks.createCredentialAdoptionAttempt).not.toHaveBeenCalled();
	});

	it('fails validation when the port is invalid', async () => {
		const payload = {
			host: '192.0.2.1',
			username: 'admin',
			siteName: 'Default',
			apiPort: 70000,
			provider: 'real' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1'
		};
		const task = createAdoptCredentialsTask({
			...payload,
			password: 'secret',
		});

		await expect(task.steps[0].execute(makeStepContext(payload))).rejects.toThrow('valid TCP port');
		expect(mocks.createCredentialAdoptionAttempt).not.toHaveBeenCalled();
	});

	it('adopts a reachable device through trackable steps', async () => {
		const payload = {
			host: '192.0.2.1',
			username: 'admin',
			siteName: 'Default',
			apiPort: 8728,
			provider: 'real' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1'
		};
		const adoptionContext = makeStepContext(payload);
		const task = createAdoptCredentialsTask({
			...payload,
			password: 'secret',
		});

		await task.steps[0].execute(adoptionContext);
		await task.steps[1].execute(adoptionContext);
		await task.steps[2].execute(adoptionContext);
		await task.steps[3].execute(adoptionContext);
		await task.steps[4].execute(adoptionContext);

		expect(mocks.readAdoptionInventory).toHaveBeenCalledWith(
			expect.objectContaining({ host: '192.0.2.1', username: 'admin' })
		);
		expect(mocks.markCredentialAdoptionSyncing).toHaveBeenCalledWith('attempt-1', 'real');
		expect(mocks.upsertAdoptionInventory).toHaveBeenCalled();
		expect(mocks.updateJob).toHaveBeenCalledWith('job-adopt-1', { deviceId: 'device-1' });
		expect(mocks.storeAdoptionReadOnlyCredential).toHaveBeenCalledWith(
			expect.objectContaining({ host: '192.0.2.1' }),
			'device-1'
		);
		expect(mocks.finishCredentialAdoption).toHaveBeenCalled();
	});
});

describe('createManagedAdoptCredentialsTask', () => {
	it('fails validation when management CIDRs are invalid', async () => {
		const payload = {
			host: '192.0.2.1',
			username: 'admin',
			siteName: 'Default',
			apiPort: 8728,
			provider: 'real' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1',
			managementCidrs: 'not-a-cidr'
		};
		const task = createManagedAdoptCredentialsTask({
			...payload,
			password: 'secret'
		});

		await expect(task.steps[0].execute(makeStepContext(payload))).rejects.toThrow(
			'Invalid management CIDR'
		);
		expect(mocks.createCredentialAdoptionAttempt).not.toHaveBeenCalled();
	});

	it('requires RouterOS real API credentials', async () => {
		const payload = {
			host: '192.0.2.1',
			username: 'admin',
			siteName: 'Default',
			apiPort: 8728,
			provider: 'mock' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1'
		};
		const task = createManagedAdoptCredentialsTask({
			...payload,
			password: 'secret'
		});

		await expect(task.steps[0].execute(makeStepContext(payload))).rejects.toThrow(
			'real RouterOS API provider'
		);
	});

	it('allows blank initial passwords for factory-default RouterOS adoption', async () => {
		const payload = {
			host: '192.0.2.1',
			username: 'admin',
			siteName: 'Default',
			apiPort: 8728,
			provider: 'real' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1'
		};
		const task = createManagedAdoptCredentialsTask({
			...payload,
			password: ''
		});

		await expect(task.steps[0].execute(makeStepContext(payload))).resolves.toEqual(
			expect.objectContaining({
				message: 'Managed adoption request is valid'
			})
		);
	});

	it('installs managed credentials, stores generated secrets, and schedules provisioning', async () => {
		const payload = {
			host: '192.0.2.1',
			username: 'admin',
			siteName: 'Default',
			apiPort: 8728,
			provider: 'real' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1',
			managementCidrs: '10.0.0.0/8,100.64.0.0/10'
		};
		const managedContext = makeStepContext(payload);
		const task = createManagedAdoptCredentialsTask({
			...payload,
			password: 'admin'
		});

		await task.steps[0].execute(managedContext);
		await task.steps[1].execute(managedContext);
		await task.steps[2].execute(managedContext);
		await task.steps[3].execute(managedContext);
		const provision = await task.steps[4].execute(managedContext);

		expect(mocks.createCredentialAdoptionAttempt).toHaveBeenCalledWith(
			expect.objectContaining({ host: '192.0.2.1' }),
			'managed'
		);
		expect(mocks.routerOsExecute).toHaveBeenCalledWith('/user/group/add', {
			attributes: expect.objectContaining({
				name: 'controller-rest-group',
				policy: expect.stringContaining('api')
			})
		});
		expect(mocks.routerOsExecute).toHaveBeenCalledWith('/file/add', {
			attributes: {
				name: 'controller-managed.pub',
				contents: 'ssh-rsa AAAATEST controller@test'
			}
		});
		expect(mocks.routerOsExecute).toHaveBeenCalledWith('/user/add', {
			attributes: expect.objectContaining({
				name: 'mt-managed',
				group: 'full',
				password: expect.any(String)
			})
		});
		expect(mocks.routerOsExecute).toHaveBeenCalledWith('/user/ssh-keys/import', {
			attributes: {
				user: 'mt-managed',
				'public-key-file': 'controller-managed.pub'
			}
		});
		expect(mocks.routerOsExecute).toHaveBeenCalledWith('/ip/service/set', {
			attributes: expect.objectContaining({
				'.id': '*api',
				disabled: false,
				address: '10.0.0.0/8,100.64.0.0/10'
			})
		});
		expect(mocks.replaceCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				deviceId: 'device-1',
				purpose: 'read_only',
				username: 'controller-rest'
			})
		);
		expect(mocks.replaceCredential).toHaveBeenCalledWith({
			deviceId: 'device-1',
			purpose: 'write',
			username: 'mt-managed',
			secretEncrypted: 'ssh-key:controller'
		});
		expect(mocks.updateDeviceState).toHaveBeenCalledWith('device-1', {
			adoptionMode: 'managed',
			adoptionState: 'fully_managed',
			connectionStatus: 'online'
		});
		expect(mocks.schedulerSchedule).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'devices.provision',
				deviceId: 'device-1'
			})
		);
		expect(mocks.finishCredentialAdoption).toHaveBeenCalledWith(
			expect.objectContaining({ host: '192.0.2.1' }),
			expect.objectContaining({
				attemptId: 'attempt-1',
				mode: 'managed'
			})
		);
		expect(provision).toEqual(
			expect.objectContaining({
				data: expect.objectContaining({
					provisioningJobId: 'job-provision-1'
				})
			})
		);
		expect(mocks.replaceCredential).not.toHaveBeenCalledWith(
			expect.objectContaining({
				username: 'admin',
				secretEncrypted: 'admin'
			})
		);
	});

	it('records adoption failure when router-side managed setup fails', async () => {
		mocks.routerOsExecute.mockRejectedValueOnce(new Error('not enough permissions'));
		const payload = {
			host: '192.0.2.1',
			username: 'admin',
			siteName: 'Default',
			apiPort: 8728,
			provider: 'real' as const,
			platform: 'routeros' as const,
			requestedByUserId: 'user-1',
			siteId: 'site-1'
		};
		const managedContext = makeStepContext(payload);
		const task = createManagedAdoptCredentialsTask({
			...payload,
			password: 'admin'
		});

		await task.steps[0].execute(managedContext);
		await task.steps[1].execute(managedContext);
		await expect(task.steps[2].execute(managedContext)).rejects.toThrow('not enough permissions');

		expect(mocks.failCredentialAdoption).toHaveBeenCalledWith(
			expect.objectContaining({ host: '192.0.2.1' }),
			'attempt-1',
			expect.any(Error)
		);
		expect(mocks.schedulerSchedule).not.toHaveBeenCalled();
	});
});

describe('createPrepareBootstrapTask', () => {
	it('generates a RouterOS bootstrap script as a task result', async () => {
		const payload = {
			siteId: 'site-1',
			requestedByUserId: 'user-1',
			controllerBaseUrl: 'https://controller.example.test/manage/site-1/devices',
			managementCidrs: '10.0.0.0/8'
		};
		const bootstrapContext = makeStepContext(payload);
		const task = createPrepareBootstrapTask(payload);

		await expect(task.steps[0].execute(bootstrapContext)).resolves.toEqual(
			expect.objectContaining({
				message: 'Bootstrap request is valid'
			})
		);

		const endpoints = await task.steps[1].execute(bootstrapContext);
		const script = await task.steps[2].execute(bootstrapContext);

		expect(endpoints).toEqual(
			expect.objectContaining({
				data: expect.objectContaining({
					enrollUrl: 'https://controller.example.test/api/v1/services/devices/enroll',
					publicKeyUrl: 'https://controller.example.test/api/v1/services/devices/bootstrap/controller.pub',
					ackUrl: 'https://controller.example.test/api/v1/services/devices/bootstrap/ack',
					publicKeyPath: '/tmp/controller-key.pub'
				})
			})
		);
		expect(script).toEqual(
			expect.objectContaining({
				data: expect.objectContaining({
					script: expect.stringContaining('/api/v1/services/devices/enroll')
				})
			})
		);
	});
});

describe('createRotateRestSecretTask', () => {
	it('uses prepared controller SSH key material for rotation', async () => {
		mocks.getDeviceCredentials.mockResolvedValue([makeReadOnlyCredential(), makeWriteCredential()]);
		const task = createRotateRestSecretTask('device-1');

		await task.steps[0].execute(makeStepContext({ deviceId: 'device-1' }));
		await task.steps[1].execute(makeStepContext({ deviceId: 'device-1' }));

		expect(mocks.getControllerSshPrivateKeyPath).toHaveBeenCalled();
		expect(mocks.sshExecute).toHaveBeenCalledWith(expect.stringContaining('/user set'));
	});
});
