import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

const mocks = vi.hoisted(() => ({
	findUserByEmail: vi.fn(),
	findUserById: vi.fn(),
	getUserRoleNames: vi.fn(),
	countUsers: vi.fn(),
	createRole: vi.fn(),
	findRoleByName: vi.fn(),
	createUser: vi.fn(),
	assignRoleToUser: vi.fn(),
	createSession: vi.fn(),
	findValidSessionByTokenHash: vi.fn(),
	deleteSessionByTokenHash: vi.fn(),
	ensureSiteByName: vi.fn(),
	hashPassword: vi.fn(),
	verifyPassword: vi.fn(),
	hashSessionToken: vi.fn((token: string) => `hash:${token}`)
}));

vi.mock('@sourceregistry/sveltekit-service-manager/server', () => ({
	ServiceManager: {
		Load: vi.fn(async (service) => service)
	}
}));

vi.mock('$lib/server/configurations/env.configuration', () => ({
	default: {
		SESSION_COOKIE_NAME: 'mnc_session',
		SESSION_DURATION_DAYS: 7
	}
}));

vi.mock('$lib/server/repositories/site.repository', () => ({
	ensureSiteByName: mocks.ensureSiteByName
}));

vi.mock('$lib/server/repositories/user.repository', () => ({
	findUserByEmail: mocks.findUserByEmail,
	findUserById: mocks.findUserById,
	getUserRoleNames: mocks.getUserRoleNames,
	countUsers: mocks.countUsers,
	createRole: mocks.createRole,
	findRoleByName: mocks.findRoleByName,
	createUser: mocks.createUser,
	assignRoleToUser: mocks.assignRoleToUser
}));

vi.mock('$lib/server/repositories/session.repository', () => ({
	createSession: mocks.createSession,
	findValidSessionByTokenHash: mocks.findValidSessionByTokenHash,
	deleteSessionByTokenHash: mocks.deleteSessionByTokenHash
}));

vi.mock('$lib/server/security/password', () => ({
	hashPassword: mocks.hashPassword,
	verifyPassword: mocks.verifyPassword
}));

vi.mock('$lib/server/security/session-token', () => ({
	hashSessionToken: mocks.hashSessionToken
}));

import { service } from './index';

function createCookies(token?: string): Pick<Cookies, 'get' | 'set' | 'delete'> {
	return {
		get: vi.fn((name: string) => (name === 'mnc_session' ? token : undefined)),
		set: vi.fn(),
		delete: vi.fn()
	};
}

describe('authentication service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates a session cookie on successful login', async () => {
		const user = {
			id: 'user-1',
			email: 'admin@example.com',
			displayName: 'Admin',
			passwordHash: 'stored-hash',
			disabledAt: null
		};
		const cookies = createCookies();

		mocks.findUserByEmail.mockResolvedValue(user);
		mocks.verifyPassword.mockReturnValue(true);
		mocks.createSession.mockResolvedValue({ session: { id: 'session-1' }, token: 'token-1' });
		mocks.getUserRoleNames.mockResolvedValue(['admin']);

		const result = await service.local.login(
			{ email: 'admin@example.com', password: 'secret' },
			{ cookies }
		);

		expect(result).toEqual({
			id: 'user-1',
			email: 'admin@example.com',
			displayName: 'Admin',
			roles: ['admin']
		});
		expect(mocks.createSession).toHaveBeenCalledWith('user-1', expect.any(Date));
		expect(cookies.set).toHaveBeenCalledWith(
			'mnc_session',
			'token-1',
			expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' })
		);
	});

	it('does not create a session for invalid credentials', async () => {
		mocks.findUserByEmail.mockResolvedValue({
			id: 'user-1',
			email: 'admin@example.com',
			displayName: 'Admin',
			passwordHash: 'stored-hash',
			disabledAt: null
		});
		mocks.verifyPassword.mockReturnValue(false);

		const result = await service.local.login(
			{ email: 'admin@example.com', password: 'wrong' },
			{ cookies: createCookies() }
		);

		expect(result).toBeUndefined();
		expect(mocks.createSession).not.toHaveBeenCalled();
	});

	it('clears the cookie when resolving an invalid session', async () => {
		const cookies = createCookies('bad-token');

		mocks.findValidSessionByTokenHash.mockResolvedValue(undefined);

		const result = await service.local.resolveUser({ cookies });

		expect(result).toBeNull();
		expect(mocks.hashSessionToken).toHaveBeenCalledWith('bad-token');
		expect(cookies.delete).toHaveBeenCalledWith(
			'mnc_session',
			expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' })
		);
	});

	it('deletes the stored session and clears the cookie on logout', async () => {
		const cookies = createCookies('token-1');

		await service.local.logout({ cookies });

		expect(mocks.deleteSessionByTokenHash).toHaveBeenCalledWith('hash:token-1');
		expect(cookies.delete).toHaveBeenCalledWith(
			'mnc_session',
			expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' })
		);
	});

	it('creates the first admin, site, and session in one flow', async () => {
		const cookies = createCookies();
		const createdUser = {
			id: 'user-1',
			email: 'admin@example.com',
			displayName: 'Admin',
			passwordHash: 'hashed-password',
			disabledAt: null
		};

		mocks.countUsers.mockResolvedValue(0);
		mocks.hashPassword.mockReturnValue('hashed-password');
		mocks.createUser.mockResolvedValue(createdUser);
		mocks.findRoleByName.mockResolvedValue(undefined);
		mocks.createRole.mockResolvedValue({ id: 'role-1', name: 'admin' });
		mocks.createSession.mockResolvedValue({ session: { id: 'session-1' }, token: 'token-1' });

		const result = await service.local.createFirstAdmin(
			{
				email: 'admin@example.com',
				displayName: 'Admin',
				password: 'very-secure-password',
				controllerName: 'HQ',
				country: 'NL'
			},
			{ cookies }
		);

		expect(mocks.createUser).toHaveBeenCalledWith({
			email: 'admin@example.com',
			displayName: 'Admin',
			passwordHash: 'hashed-password'
		});
		expect(mocks.assignRoleToUser).toHaveBeenCalledWith('user-1', 'role-1');
		expect(mocks.ensureSiteByName).toHaveBeenCalledWith('HQ', 'NL');
		expect(mocks.createSession).toHaveBeenCalledWith('user-1', expect.any(Date));
		expect(result).toEqual({
			id: 'user-1',
			email: 'admin@example.com',
			displayName: 'Admin',
			roles: ['admin']
		});
	});
});
