export function load({ locals, url }) {
	return {
		user: locals.user,
		pathname: url.pathname
	};
}
