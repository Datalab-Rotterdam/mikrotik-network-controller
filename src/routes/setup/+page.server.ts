import { fail, redirect } from '@sveltejs/kit';
import { createFirstAdmin, createLoginSession } from '$lib/server/services/auth.service';

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const displayName = String(formData.get('displayName') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const confirmPassword = String(formData.get('confirmPassword') ?? '');

		if (!email || !displayName || !password) {
			return fail(400, { message: 'Email, name, and password are required.', email, displayName });
		}

		if (password.length < 12) {
			return fail(400, {
				message: 'Use at least 12 characters for the administrator password.',
				email,
				displayName
			});
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Password confirmation does not match.', email, displayName });
		}

		try {
			const user = await createFirstAdmin({ email, displayName, password });
			await createLoginSession(cookies, user.id);
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to complete setup.',
				email,
				displayName
			});
		}

		throw redirect(303, '/');
	}
};
