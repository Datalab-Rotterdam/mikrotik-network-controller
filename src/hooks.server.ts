import { redirect, type Handle } from '@sveltejs/kit';
import { hasAnyUsers, resolveUserFromCookies } from '$lib/server/services/auth.service';

const publicRoutes = ['/login', '/setup'];

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	const setupComplete = await hasAnyUsers();

	event.locals.user = await resolveUserFromCookies(event.cookies);

	if (!setupComplete && pathname !== '/setup') {
		throw redirect(303, '/setup');
	}

	if (setupComplete && pathname === '/setup') {
		throw redirect(303, event.locals.user ? '/' : '/login');
	}

	const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

	if (setupComplete && !event.locals.user && !isPublicRoute) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	if (event.locals.user && pathname === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};
