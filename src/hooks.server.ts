import { redirect, type Handle } from '@sveltejs/kit';
import { hasAnyUsers, resolveUserFromCookies } from '$lib/server/services/auth.service';

const loginRoute = '/manage/account/login';
const publicRoutes = [loginRoute, '/setup'];

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	const setupComplete = await hasAnyUsers();

	event.locals.user = await resolveUserFromCookies(event.cookies);

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
