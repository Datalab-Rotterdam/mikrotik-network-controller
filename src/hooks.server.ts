import '$lib/server/websockets.server';
import { startMonitoring } from '$lib/server/services/monitoring.service';
import { startNotificationService } from '$lib/server/services/notification.service';
import { redirect, type Handle } from '@sveltejs/kit';

startMonitoring();
startNotificationService();
import { hasAnyUsers, resolveUserFromCookies } from '$lib/server/services/auth.service';
import { findApiKeyByRaw, touchApiKey } from '$lib/server/repositories/api-keys.repository';
import { getUserRoleNames } from '$lib/server/repositories/user.repository';
import { findUserById } from '$lib/server/repositories/user.repository';

const loginRoute = '/manage/account/login';
const publicRoutes = [loginRoute, '/setup'];

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	const setupComplete = await hasAnyUsers();

	// API key auth for /api/ routes
	const authHeader = event.request.headers.get('authorization') ?? '';
	if (authHeader.startsWith('Bearer mtk_')) {
		const raw = authHeader.slice('Bearer '.length);
		const keyRow = await findApiKeyByRaw(raw);
		if (keyRow && (!keyRow.expiresAt || keyRow.expiresAt > new Date())) {
			const user = await findUserById(keyRow.userId);
			if (user && !user.disabledAt) {
				const roles = await getUserRoleNames(user.id);
				event.locals.user = { id: user.id, email: user.email, displayName: user.displayName, roles };
				void touchApiKey(keyRow.id);
			}
		}
	}

	if (!event.locals.user) {
		event.locals.user = await resolveUserFromCookies(event.cookies);
	}

	if (!setupComplete && pathname !== '/setup' && !pathname.startsWith('/setup/')) {
		throw redirect(303, '/setup');
	}

	if (setupComplete && pathname === '/setup') {
		throw redirect(303, event.locals.user ? '/' : loginRoute);
	}

	if (setupComplete && pathname === '/login') {
		throw redirect(303, `${loginRoute}${event.url.search}`);
	}

	const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

	if (setupComplete && !event.locals.user && !isPublicRoute) {
		throw redirect(303, `${loginRoute}?redirectTo=${encodeURIComponent(`${pathname}${event.url.search}`)}`);
	}

	if (event.locals.user && pathname === loginRoute) {
		throw redirect(303, '/');
	}

	return resolve(event);
};
