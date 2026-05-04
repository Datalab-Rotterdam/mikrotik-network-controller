import '$lib/server/services/actionbus.service';
import '$lib/server/websockets.server';
import { startMonitoring } from '$lib/server/services/monitoring.service';
import { startNotificationService } from '$lib/server/services/notification.service';
import { redirect, type Handle } from '@sveltejs/kit';
import { hasAnyUsers } from '$lib/server/services/auth.service';
import { requireAuth, requireSetupComplete, blockSetupIfComplete } from '$lib/server/middleware/auth-guards';
import { findApiKeyByRaw, touchApiKey } from '$lib/server/repositories/api-keys.repository';
import { getUserRoleNames } from '$lib/server/repositories/user.repository';
import { findUserById } from '$lib/server/repositories/user.repository';

startMonitoring();
startNotificationService();

const loginRoute = '/manage/account/login';
const publicRoutes = [loginRoute, '/setup'];

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

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

	// Run middleware guards
	await requireSetupComplete(event, hasAnyUsers);
	await blockSetupIfComplete(event, hasAnyUsers);

	// Legacy /login redirect
	if (pathname === '/login') {
		throw redirect(303, `${loginRoute}${event.url.search}`);
	}

	// Auth gate for protected routes
	const isPublicRoute = publicRoutes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);

	if (!event.locals.user && !isPublicRoute) {
		await requireAuth(event);
	}

	// Already logged in users shouldn't see the login page
	if (event.locals.user && pathname === loginRoute) {
		throw redirect(303, '/');
	}

	return resolve(event);
};
