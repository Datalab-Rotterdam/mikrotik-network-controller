import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { resolveUserFromCookies } from '$lib/server/services/auth.service';

/**
 * Auth guard — ensures the user is logged in.
 * Redirects to login if not authenticated.
 */
export async function requireAuth(event: Parameters<Handle>[0]['event']): Promise<void> {
    const user = await resolveUserFromCookies(event.cookies);
    if (!user) {
        const loginRoute = '/manage/account/login';
        const redirectTo = `${event.url.pathname}${event.url.search}`;
        throw redirect(303, `${loginRoute}?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
    event.locals.user = user;
}

/**
 * Setup guard — redirects to setup wizard if no users exist.
 */
export async function requireSetupComplete(
    event: Parameters<Handle>[0]['event'],
    hasUsers: () => Promise<boolean>
): Promise<void> {
    const setupComplete = await hasUsers();
    if (!setupComplete) {
        throw redirect(303, '/setup');
    }
}

/**
 * Redirect away from setup if setup is already complete.
 */
export async function blockSetupIfComplete(
    event: Parameters<Handle>[0]['event'],
    hasUsers: () => Promise<boolean>
): Promise<void> {
    const setupComplete = await hasUsers();
    if (setupComplete && event.url.pathname === '/setup') {
        const user = await resolveUserFromCookies(event.cookies);
        throw redirect(303, user ? '/' : '/manage/account/login');
    }
}
