import type { Cookies } from '@sveltejs/kit';
import { ServiceManager } from '@sourceregistry/sveltekit-service-manager/server';
import type { Service } from '@sourceregistry/sveltekit-service-manager';
import env from '$lib/server/configurations/env.configuration';
import { ensureSiteByName } from '$lib/server/repositories/site.repository';
import {
	assignRoleToUser,
	countUsers,
	createRole,
	createUser,
	findRoleByName,
	findUserByEmail,
	findUserById,
	getUserRoleNames,
	type UserRecord
} from '$lib/server/repositories/user.repository';
import {
	createSession,
	deleteSessionByTokenHash,
	findValidSessionByTokenHash
} from '$lib/server/repositories/session.repository';
import { hashPassword, verifyPassword } from '$lib/server/security/password';
import { hashSessionToken } from '$lib/server/security/session-token';

export type AuthenticatedUser = {
	id: string;
	email: string;
	displayName: string;
	roles: string[];
};

type CookieEvent = {
	cookies: Pick<Cookies, 'get' | 'set' | 'delete'>;
};

type ResolveUserInput =
	| {
			cookies: Pick<Cookies, 'get' | 'delete'>;
	  }
	| {
			token: string;
	  };

type CreateFirstAdminInput = {
	email: string;
	displayName: string;
	password: string;
	controllerName?: string;
	country?: string;
};

const sessionCookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production'
};

function toAuthenticatedUser(user: UserRecord, roles: string[]): AuthenticatedUser {
	return {
		id: user.id,
		email: user.email,
		displayName: user.displayName,
		roles
	};
}

async function issueSession(userId: string, event?: CookieEvent): Promise<void> {
	if (!event?.cookies) {
		return;
	}

	const expiresAt = new Date(Date.now() + env.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
	const { token } = await createSession(userId, expiresAt);

	event.cookies.set(env.SESSION_COOKIE_NAME, token, {
		...sessionCookieOptions,
		expires: expiresAt
	});
}

function clearSessionCookie(cookies: Pick<Cookies, 'delete'>): void {
	cookies.delete(env.SESSION_COOKIE_NAME, sessionCookieOptions);
}

async function authenticateUser(user: UserRecord): Promise<AuthenticatedUser> {
	return toAuthenticatedUser(user, await getUserRoleNames(user.id));
}

async function createAdminRoleIfNeeded() {
	return (
		(await findRoleByName('admin')) ??
		(await createRole({
			name: 'admin',
			description: 'Full controller administration access',
			isSystem: true,
			permissions: ['*']
		}))
	);
}

export const service = {
	name: 'authentication',
	local: {
		async login(input: { email: string; password: string }, event?: CookieEvent) {
			const user = await findUserByEmail(input.email);
			if (!user || user.disabledAt || !verifyPassword(input.password, user.passwordHash)) {
				return undefined;
			}

			await issueSession(user.id, event);
			return authenticateUser(user);
		},
		async logout(event: CookieEvent) {
			const token = event.cookies.get(env.SESSION_COOKIE_NAME);
			if (token) {
				await deleteSessionByTokenHash(hashSessionToken(token));
			}

			clearSessionCookie(event.cookies);
		},
		async resolveUser(input: ResolveUserInput): Promise<AuthenticatedUser | null> {
			const token = 'token' in input ? input.token : input.cookies.get(env.SESSION_COOKIE_NAME);
			if (!token) {
				return null;
			}

			const session = await findValidSessionByTokenHash(hashSessionToken(token));
			if (!session) {
				if ('cookies' in input) {
					clearSessionCookie(input.cookies);
				}
				return null;
			}

			const user = await findUserById(session.userId);
			if (!user || user.disabledAt) {
				if ('cookies' in input) {
					clearSessionCookie(input.cookies);
				}
				return null;
			}

			return authenticateUser(user);
		},
		async createFirstAdmin(input: CreateFirstAdminInput, event?: CookieEvent) {
			if ((await countUsers()) > 0) {
				throw new Error('Initial setup has already been completed.');
			}

			const user = await createUser({
				email: input.email,
				displayName: input.displayName,
				passwordHash: hashPassword(input.password)
			});

			const adminRole = await createAdminRoleIfNeeded();
			await assignRoleToUser(user.id, adminRole.id);

			if (input.controllerName) {
				await ensureSiteByName(input.controllerName, input.country);
			}

			await issueSession(user.id, event);
			return toAuthenticatedUser(user, [adminRole.name]);
		}
	}
} satisfies Service<'authentication'>;

export type AuthenticationService = typeof service;

export default await ServiceManager.Load(service, import.meta);
