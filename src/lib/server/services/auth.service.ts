import type { Cookies } from '@sveltejs/kit';
import env from '$lib/server/configurations/env.configuration';
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
	createUserSession,
	deleteSessionByTokenHash,
	findValidSessionByTokenHash
} from '$lib/server/repositories/session.repository';
import { hashPassword, verifyPassword } from '$lib/server/security/password';
import { createSessionToken, hashSessionToken } from '$lib/server/security/session-token';

export type AuthenticatedUser = {
	id: string;
	email: string;
	displayName: string;
	roles: string[];
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

export async function hasAnyUsers(): Promise<boolean> {
	return (await countUsers()) > 0;
}

export async function createFirstAdmin(input: {
	email: string;
	displayName: string;
	password: string;
}): Promise<AuthenticatedUser> {
	if (await hasAnyUsers()) {
		throw new Error('Initial setup has already been completed.');
	}

	const user = await createUser({
		email: input.email,
		displayName: input.displayName,
		passwordHash: hashPassword(input.password)
	});

	const adminRole =
		(await findRoleByName('admin')) ??
		(await createRole({
			name: 'admin',
			description: 'Full controller administration access',
			isSystem: true,
			permissions: ['*']
		}));

	await assignRoleToUser(user.id, adminRole.id);

	return toAuthenticatedUser(user, [adminRole.name]);
}

export async function loginUser(email: string, password: string): Promise<AuthenticatedUser | undefined> {
	const user = await findUserByEmail(email);

	if (!user || user.disabledAt || !verifyPassword(password, user.passwordHash)) {
		return undefined;
	}

	return toAuthenticatedUser(user, await getUserRoleNames(user.id));
}

export async function createLoginSession(cookies: Cookies, userId: string): Promise<void> {
	const token = createSessionToken();
	const tokenHash = hashSessionToken(token);
	const expiresAt = new Date(Date.now() + env.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

	await createUserSession(userId, tokenHash, expiresAt);
	cookies.set(env.SESSION_COOKIE_NAME, token, {
		...sessionCookieOptions,
		expires: expiresAt
	});
}

export async function resolveUserFromCookies(cookies: Cookies): Promise<AuthenticatedUser | null> {
	const token = cookies.get(env.SESSION_COOKIE_NAME);

	if (!token) {
		return null;
	}

	const session = await findValidSessionByTokenHash(hashSessionToken(token));

	if (!session) {
		cookies.delete(env.SESSION_COOKIE_NAME, { path: '/' });
		return null;
	}

	const user = await findUserById(session.userId);

	if (!user || user.disabledAt) {
		return null;
	}

	return toAuthenticatedUser(user, await getUserRoleNames(user.id));
}

export async function logout(cookies: Cookies): Promise<void> {
	const token = cookies.get(env.SESSION_COOKIE_NAME);

	if (token) {
		await deleteSessionByTokenHash(hashSessionToken(token));
	}

	cookies.delete(env.SESSION_COOKIE_NAME, { path: '/' });
}
