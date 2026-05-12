import { type EnhanceInput, not_good } from '@sourceregistry/sveltekit-enhance';
import { redirect } from '@sveltejs/kit';

export const SessionContext = {
	ensure(input: EnhanceInput) {
		if (!input.locals.user)
			throw redirect(302, `/manage/account/login?redirectTo=${encodeURIComponent(input.url.pathname)}`);
		return {
			user: input.locals.user!
		};
	},

	require(input: EnhanceInput) {
		if (!input.locals.user)
			throw not_good(input, 401, { message: 'User is required.' });
		return {
			user: input.locals.user!
		};
	}
};
