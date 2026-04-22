import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	findSiteById: vi.fn(),
	getDeviceByIdForSite: vi.fn(),
	loadSiteDeviceState: vi.fn(),
	adoptWithCredentials: vi.fn(),
	prepareBootstrap: vi.fn(),
	provision: vi.fn(),
	remove: vi.fn()
}));

vi.mock('$lib/server/repositories/device.repository', () => ({
	getDeviceByIdForSite: mocks.getDeviceByIdForSite
}));

vi.mock('$lib/server/repositories/site.repository', () => ({
	findSiteById: mocks.findSiteById
}));

vi.mock('$lib/server/services/site-device.service', () => ({
	loadSiteDeviceState: mocks.loadSiteDeviceState
}));

vi.mock('$lib/server/services/devices.service', () => ({
	service: {
		local: {
			adoption: {
				adoptWithCredentials: mocks.adoptWithCredentials,
				prepareBootstrap: mocks.prepareBootstrap
			},
			provisioning: {
				provision: mocks.provision
			},
			removal: {
				remove: mocks.remove
			}
		}
	}
}));

const { actions } = await import('./+page.server');

function makeRequest(formData: FormData): Request {
	return new Request('http://controller.test/manage/site-1/devices?/adopt', {
		method: 'POST',
		body: formData
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.findSiteById.mockResolvedValue({ id: 'site-1', name: 'Default' });
	mocks.getDeviceByIdForSite.mockResolvedValue({
		id: 'device-1',
		name: 'Core router',
		identity: 'core-router',
		platform: 'routeros'
	});
	mocks.adoptWithCredentials.mockResolvedValue({ ok: true, jobId: 'job-managed-1' });
	mocks.provision.mockResolvedValue({ jobId: 'job-provision-1' });
	mocks.remove.mockResolvedValue({ jobId: 'job-remove-1' });
});

describe('devices page actions', () => {
	it('passes management CIDRs into managed credential adoption', async () => {
		const formData = new FormData();
		formData.set('mode', 'credentials');
		formData.set('host', '192.168.1.156');
		formData.set('username', 'admin');
		formData.set('password', 'admin');
		formData.set('siteName', 'Default');
		formData.set('provider', 'real');
		formData.set('platform', 'routeros');
		formData.set('apiPort', '8728');
		formData.set('managementCidrs', '10.0.0.0/8,100.64.0.0/10');

		const result = await actions.adopt({
			request: makeRequest(formData),
			locals: {
				user: { id: 'user-1' }
			},
			params: {
				site_id: 'site-1'
			},
			url: new URL('http://controller.test/manage/site-1/devices')
		} as never);

		expect(mocks.adoptWithCredentials).toHaveBeenCalledWith({
			host: '192.168.1.156',
			username: 'admin',
			password: 'admin',
			siteName: 'Default',
			siteId: 'site-1',
			apiPort: 8728,
			provider: 'real',
			platform: 'routeros',
			requestedByUserId: 'user-1',
			managementCidrs: '10.0.0.0/8,100.64.0.0/10'
		});
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
				jobId: 'job-managed-1'
			})
		);
	});

	it('allows blank passwords for factory-default managed adoption', async () => {
		const formData = new FormData();
		formData.set('mode', 'credentials');
		formData.set('host', '192.168.1.156');
		formData.set('username', 'admin');
		formData.set('password', '');
		formData.set('siteName', 'Default');
		formData.set('provider', 'real');
		formData.set('platform', 'routeros');
		formData.set('apiPort', '8728');

		await actions.adopt({
			request: makeRequest(formData),
			locals: {
				user: { id: 'user-1' }
			},
			params: {
				site_id: 'site-1'
			},
			url: new URL('http://controller.test/manage/site-1/devices')
		} as never);

		expect(mocks.adoptWithCredentials).toHaveBeenCalledWith(
			expect.objectContaining({
				username: 'admin',
				password: ''
			})
		);
	});

	it('can provision from the list quick view', async () => {
		const formData = new FormData();
		formData.set('deviceId', 'device-1');

		const result = await actions.provision({
			request: makeRequest(formData),
			locals: {
				user: { id: 'user-1' }
			},
			params: {
				site_id: 'site-1'
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

	it('can remove from the list quick view', async () => {
		const formData = new FormData();
		formData.set('deviceId', 'device-1');

		const result = await actions.remove({
			request: makeRequest(formData),
			locals: {
				user: { id: 'user-1' }
			},
			params: {
				site_id: 'site-1'
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
