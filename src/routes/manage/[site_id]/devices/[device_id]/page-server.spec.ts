import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	findSiteById: vi.fn(),
	getDeviceByIdForSite: vi.fn(),
	listDeviceInterfaces: vi.fn(),
	getActiveCredential: vi.fn(),
	listJobsByDevice: vi.fn(),
	getJobWithSteps: vi.fn(),
	resolveDeviceImage: vi.fn(),
	provision: vi.fn(),
	remove: vi.fn(),
	websocketUse: vi.fn()
}));

vi.mock('$lib/server/repositories/device.repository', () => ({
	getDeviceByIdForSite: mocks.getDeviceByIdForSite
}));

vi.mock('$lib/server/repositories/site.repository', () => ({
	findSiteById: mocks.findSiteById
}));

vi.mock('$lib/server/repositories/telemetry.repository', () => ({
	listDeviceInterfaces: mocks.listDeviceInterfaces,
	getActiveCredential: mocks.getActiveCredential
}));

vi.mock('$lib/server/repositories/job.repository', () => ({
	listJobsByDevice: mocks.listJobsByDevice,
	getJobWithSteps: mocks.getJobWithSteps
}));

vi.mock('$lib/server/services/device-image-catalog.service', () => ({
	resolveDeviceImage: mocks.resolveDeviceImage
}));

vi.mock('@sourceregistry/sveltekit-websockets/server', () => ({
	websockets: {
		use: mocks.websocketUse
	}
}));

vi.mock('$lib/server/services/devices.service', () => ({
	service: {
		local: {
			provisioning: {
				provision: mocks.provision
			},
			removal: {
				remove: mocks.remove
			}
		}
	}
}));

const { actions, load } = await import('./+page.server');

const device = {
	id: 'device-1',
	siteId: 'site-1',
	name: 'Core router',
	host: '192.168.88.1',
	apiPort: 8728,
	sshPort: 22,
	platform: 'routeros',
	adoptionMode: 'managed',
	adoptionState: 'fully_managed',
	connectionStatus: 'online',
	model: 'hAP ax3',
	identity: 'core-router',
	serialNumber: 'SER123',
	architecture: 'arm64',
	uptimeSeconds: 3600,
	routerOsVersion: '7.15',
	capabilities: ['interfaces'],
	tags: ['core'],
	lastSeenAt: new Date('2026-04-22T08:00:00.000Z'),
	lastSyncAt: new Date('2026-04-22T08:05:00.000Z')
};

function makeRequest(formData: FormData, action = 'provision'): Request {
	return new Request(`http://controller.test/manage/site-1/devices/device-1?/${action}`, {
		method: 'POST',
		body: formData
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.findSiteById.mockResolvedValue({ id: 'site-1', name: 'Default' });
	mocks.getDeviceByIdForSite.mockResolvedValue(device);
	mocks.listDeviceInterfaces.mockResolvedValue([
		{
			id: 'interface-1',
			deviceId: 'device-1',
			name: 'ether1',
			type: 'ether',
			macAddress: 'AA:BB:CC:DD:EE:FF',
			comment: 'uplink',
			running: true,
			disabled: false
		}
	]);
	mocks.getActiveCredential.mockResolvedValue({
		id: 'credential-1',
		deviceId: 'device-1',
		purpose: 'write',
		username: 'mt-managed',
		secretEncrypted: 'ssh-key:controller',
		isActive: true
	});
	mocks.listJobsByDevice.mockResolvedValue([
		{
			id: 'job-1'
		}
	]);
	mocks.getJobWithSteps.mockResolvedValue({
		id: 'job-1',
		type: 'provision-device',
		status: 'succeeded',
		deviceId: 'device-1',
		siteId: 'site-1',
		requestedByUserId: 'user-1',
		progress: 100,
		attemptCount: 1,
		maxAttempts: 1,
		payload: {},
		result: {},
		errorMessage: null,
		scheduledFor: null,
		lockedAt: null,
		lockedBy: null,
		startedAt: new Date('2026-04-22T08:01:00.000Z'),
		finishedAt: new Date('2026-04-22T08:02:00.000Z'),
		createdAt: new Date('2026-04-22T08:00:00.000Z'),
		updatedAt: new Date('2026-04-22T08:02:00.000Z'),
		steps: [
			{
				id: 'step-1',
				jobId: 'job-1',
				index: 0,
				name: 'Apply baseline',
				status: 'succeeded',
				result: {},
				errorMessage: null,
				revertResult: null,
				revertErrorMessage: null,
				startedAt: new Date('2026-04-22T08:01:00.000Z'),
				finishedAt: new Date('2026-04-22T08:02:00.000Z'),
				revertedAt: null,
				createdAt: new Date('2026-04-22T08:00:00.000Z'),
				updatedAt: new Date('2026-04-22T08:02:00.000Z')
			}
		]
	});
	mocks.resolveDeviceImage.mockReturnValue({
		id: 'hap-ax3',
		label: 'hAP ax3',
		src: '/images/hap-ax3.webp'
	});
	mocks.provision.mockResolvedValue({ jobId: 'job-provision-1' });
	mocks.remove.mockResolvedValue({ jobId: 'job-remove-1' });
	mocks.websocketUse.mockReturnValue('ws://controller.test/_/connect/terminal-key');
});

describe('device detail page load', () => {
	it('loads a persisted device scoped to the active site', async () => {
		const result = await load({
			parent: async () => ({ site: { id: 'site-1', name: 'Default' } }),
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(mocks.getDeviceByIdForSite).toHaveBeenCalledWith('device-1', 'site-1');
		expect(mocks.resolveDeviceImage).toHaveBeenCalledWith('hAP ax3', 'routeros');
		expect(result).toEqual(
			expect.objectContaining({
				device,
				deviceImage: {
					id: 'hap-ax3',
					label: 'hAP ax3',
					src: '/images/hap-ax3.webp'
				}
			})
		);
	});

	it('returns interfaces and hydrated recent jobs for the device', async () => {
		const result = await load({
			parent: async () => ({ site: { id: 'site-1', name: 'Default' } }),
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(mocks.listDeviceInterfaces).toHaveBeenCalledWith('device-1');
		expect(mocks.getActiveCredential).toHaveBeenCalledWith('device-1', 'write');
		expect(mocks.listJobsByDevice).toHaveBeenCalledWith('device-1', 20);
		expect(mocks.getJobWithSteps).toHaveBeenCalledWith('job-1');
		expect(result.interfaces).toHaveLength(1);
		expect(result.jobs).toEqual([
			expect.objectContaining({
				id: 'job-1',
				createdAt: '2026-04-22T08:00:00.000Z',
				steps: [
					expect.objectContaining({
						id: 'step-1',
						finishedAt: '2026-04-22T08:02:00.000Z'
					})
				]
			})
		]);
	});

	it('returns 404 when the device is missing or belongs to another site', async () => {
		mocks.getDeviceByIdForSite.mockResolvedValue(null);

		await expect(
			load({
				parent: async () => ({ site: { id: 'site-1', name: 'Default' } }),
				params: {
					site_id: 'site-1',
					device_id: 'device-unknown'
				}
			} as never)
		).rejects.toMatchObject({
			status: 404
		});
	});

	it('marks terminal available for admins on managed RouterOS devices with SSH trust', async () => {
		const result = await load({
			locals: {
				user: { id: 'user-1', roles: ['admin'] }
			},
			parent: async () => ({ site: { id: 'site-1', name: 'Default' } }),
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result.terminalAvailable).toBe(true);
	});

	it('hides terminal access when the user is not an admin', async () => {
		const result = await load({
			locals: {
				user: { id: 'user-1', roles: [] }
			},
			parent: async () => ({ site: { id: 'site-1', name: 'Default' } }),
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result.terminalAvailable).toBe(false);
	});
});

describe('device detail page actions', () => {
	it('can provision from the dedicated device page', async () => {
		const formData = new FormData();
		formData.set('deviceId', 'device-1');

		const result = await actions.provision({
			request: makeRequest(formData),
			locals: {
				user: { id: 'user-1' }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(mocks.provision).toHaveBeenCalledWith('device-1');
		expect(result).toEqual(
			expect.objectContaining({
				action: 'provision',
				success: true,
				jobId: 'job-provision-1',
				deviceId: 'device-1'
			})
		);
	});

	it('can remove from the dedicated device page', async () => {
		const formData = new FormData();
		formData.set('deviceId', 'device-1');

		const result = await actions.remove({
			request: makeRequest(formData, 'remove'),
			locals: {
				user: { id: 'user-1' }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(mocks.remove).toHaveBeenCalledWith('device-1', 'user-1');
		expect(result).toEqual(
			expect.objectContaining({
				action: 'remove',
				success: true,
				jobId: 'job-remove-1',
				deviceId: 'device-1'
			})
		);
	});

});
