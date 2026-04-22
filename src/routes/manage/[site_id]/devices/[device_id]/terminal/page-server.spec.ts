import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getDeviceByIdForSite: vi.fn(),
	getActiveCredential: vi.fn(),
	websocketUse: vi.fn()
}));

vi.mock('$lib/server/repositories/device.repository', () => ({
	getDeviceByIdForSite: mocks.getDeviceByIdForSite
}));

vi.mock('$lib/server/repositories/telemetry.repository', () => ({
	getActiveCredential: mocks.getActiveCredential
}));

vi.mock('@sourceregistry/sveltekit-websockets/server', () => ({
	websockets: {
		use: mocks.websocketUse
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

function makeRequest(): Request {
	return new Request('http://controller.test/manage/site-1/devices/device-1/terminal?/terminal', {
		method: 'POST',
		body: new FormData()
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getDeviceByIdForSite.mockResolvedValue(device);
	mocks.getActiveCredential.mockResolvedValue({
		id: 'credential-1',
		deviceId: 'device-1',
		purpose: 'write',
		username: 'mt-managed',
		secretEncrypted: 'ssh-key:controller',
		isActive: true
	});
	mocks.websocketUse.mockReturnValue('ws://controller.test/_/connect/terminal-key');
});

describe('device terminal page load', () => {
	it('loads the device context and exposes terminal availability', async () => {
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

		expect(mocks.getDeviceByIdForSite).toHaveBeenCalledWith('device-1', 'site-1');
		expect(mocks.getActiveCredential).toHaveBeenCalledWith('device-1', 'write');
		expect(result).toEqual(
			expect.objectContaining({
				device,
				terminalAvailable: true
			})
		);
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
});

describe('device terminal page actions', () => {
	it('creates a device-scoped terminal websocket for admins', async () => {
		const result = await actions.terminal({
			request: makeRequest(),
			locals: {
				user: { id: 'user-1', roles: ['admin'] }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(mocks.getDeviceByIdForSite).toHaveBeenCalledWith('device-1', 'site-1');
		expect(mocks.getActiveCredential).toHaveBeenCalledWith('device-1', 'write');
		expect(mocks.websocketUse).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({
					site_id: 'site-1',
					device_id: 'device-1'
				})
			}),
			expect.any(Function),
			expect.objectContaining({
				pendingKeyExpiration: 60_000
			})
		);
		expect(result).toEqual(
			expect.objectContaining({
				action: 'terminal',
				success: true,
				url: 'ws://controller.test/_/connect/terminal-key'
			})
		);
	});

	it('rejects terminal access for unauthenticated users', async () => {
		const result = await actions.terminal({
			request: makeRequest(),
			locals: {
				user: null
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				status: 401,
				data: expect.objectContaining({
					success: false
				})
			})
		);
		expect(mocks.websocketUse).not.toHaveBeenCalled();
	});

	it('rejects terminal access for non-admin users', async () => {
		const result = await actions.terminal({
			request: makeRequest(),
			locals: {
				user: { id: 'user-1', roles: [] }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				status: 403,
				data: expect.objectContaining({
					success: false
				})
			})
		);
		expect(mocks.websocketUse).not.toHaveBeenCalled();
	});

	it('rejects terminal access when the device does not belong to the site', async () => {
		mocks.getDeviceByIdForSite.mockResolvedValue(null);

		const result = await actions.terminal({
			request: makeRequest(),
			locals: {
				user: { id: 'user-1', roles: ['admin'] }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				status: 404,
				data: expect.objectContaining({
					success: false
				})
			})
		);
		expect(mocks.websocketUse).not.toHaveBeenCalled();
	});

	it('rejects terminal access when the device is not eligible', async () => {
		mocks.getDeviceByIdForSite.mockResolvedValue({
			...device,
			adoptionMode: 'read_only',
			adoptionState: 'monitored'
		});

		const result = await actions.terminal({
			request: makeRequest(),
			locals: {
				user: { id: 'user-1', roles: ['admin'] }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				status: 403,
				data: expect.objectContaining({
					success: false
				})
			})
		);
		expect(mocks.websocketUse).not.toHaveBeenCalled();
	});

	it('rejects terminal access for non-RouterOS devices', async () => {
		mocks.getDeviceByIdForSite.mockResolvedValue({
			...device,
			platform: 'switchos'
		});

		const result = await actions.terminal({
			request: makeRequest(),
			locals: {
				user: { id: 'user-1', roles: ['admin'] }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				status: 403,
				data: expect.objectContaining({
					success: false
				})
			})
		);
		expect(mocks.websocketUse).not.toHaveBeenCalled();
	});

	it('rejects terminal access when the write credential is missing', async () => {
		mocks.getActiveCredential.mockResolvedValue(undefined);

		const result = await actions.terminal({
			request: makeRequest(),
			locals: {
				user: { id: 'user-1', roles: ['admin'] }
			},
			params: {
				site_id: 'site-1',
				device_id: 'device-1'
			}
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				status: 403,
				data: expect.objectContaining({
					success: false
				})
			})
		);
		expect(mocks.websocketUse).not.toHaveBeenCalled();
	});
});
