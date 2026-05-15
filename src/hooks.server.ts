import '$lib/server/services/actionbus.service';
import '$lib/server/services/auth.service';
import '$lib/server/services/discovery.service';
import '$lib/server/services/monitoring.service';
import '$lib/server/services/notification.service';
import '$lib/server/services/syslog.service';
import { Service } from '@sourceregistry/sveltekit-service-manager/server';
import { redirect, type Handle } from '@sveltejs/kit';
import { requireAuth, requireSetupComplete, blockSetupIfComplete } from '$lib/server/middleware/auth-guards';
import { ApiKeyRepository } from '$lib/server/repositories/api-keys.repository';
import { UserRepository } from '$lib/server/repositories/user.repository';

Service('monitoring').start();
Service('notification').start();
Service('syslog').start();

const loginRoute = '/manage/account/login';
const publicRoutes = [loginRoute, '/setup', '/dev'];

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// API key auth for /api/ routes
	const authHeader = event.request.headers.get('authorization') ?? '';
	if (authHeader.startsWith('Bearer mtk_')) {
		const raw = authHeader.slice('Bearer '.length);
		const keyRow = await ApiKeyRepository.findByRaw(raw);
		if (keyRow && (!keyRow.expiresAt || keyRow.expiresAt > new Date())) {
			const user = await UserRepository.findById(keyRow.userId);
			if (user && !user.disabledAt) {
				const roles = await UserRepository.getRoleNames(user.id);
				event.locals.user = { id: user.id, email: user.email, displayName: user.displayName, roles };
				void ApiKeyRepository.touch(keyRow.id);
			}
		}
	}

	// Run middleware guards
	await requireSetupComplete(event, () => Service('auth').hasAnyUsers());
	await blockSetupIfComplete(event, () => Service('auth').hasAnyUsers());

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
