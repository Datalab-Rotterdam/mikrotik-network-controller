import { fail, redirect } from '@sveltejs/kit';
import { createFirstAdmin, createLoginSession } from '$lib/server/services/auth.service';
import { ensureSiteByName } from '$lib/server/repositories/site.repository';

export const load = ({ url }) => {
	const controllerName = url.searchParams.get('controllerName')?.trim();

	if (!controllerName || url.searchParams.get('acceptedTerms') !== 'yes') {
		throw redirect(303, '/setup/configure/controller-name');
	}

	return {
		setup: {
			controllerName,
			country: url.searchParams.get('country')?.trim() || ''
		}
	};
};

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const controllerName = String(formData.get('controllerName') ?? 'Default').trim() || 'Default';
		const country = String(formData.get('country') ?? '').trim();
		const email = String(formData.get('email') ?? '').trim();
		const displayName = String(formData.get('displayName') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const confirmPassword = String(formData.get('confirmPassword') ?? '');

		if (!email || !displayName || !password) {
			return fail(400, { message: 'Email, name, and password are required.', email, displayName, controllerName, country });
		}

		if (password.length < 12) {
			return fail(400, {
				message: 'Use at least 12 characters for the administrator password.',
				email,
				displayName,
				controllerName,
				country
			});
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Password confirmation does not match.', email, displayName, controllerName, country });
		}

		try {
			const user = await createFirstAdmin({ email, displayName, password });
			await ensureSiteByName(controllerName, country);
			await createLoginSession(cookies, user.id);
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Unable to complete setup.',
				email,
				displayName,
				controllerName,
				country
			});
		}

		throw redirect(303, '/');
	}
};
