import { fail, redirect } from '@sveltejs/kit';
import { Service } from '@sourceregistry/sveltekit-service-manager/server';
import '$lib/server/services/auth.service';

export const actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const redirectTo = url.searchParams.get('redirectTo') ?? '/';

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.', email });
		}

		const user = await Service('auth').loginUser(email, password);

		if (!user) {
			return fail(401, { message: 'Invalid email or password.', email });
		}

		await Service('auth').createLoginSession(cookies, user.id);

		throw redirect(303, redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/');
	}
};
