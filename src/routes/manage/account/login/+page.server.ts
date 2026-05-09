import {fail, redirect} from '@sveltejs/kit';
import {enhance, Form} from "@sourceregistry/sveltekit-enhance";
import {v} from "@sourceregistry/node-validator";
import {Service} from "@sourceregistry/sveltekit-service-manager";

const schema = v.object({
    email: v.string({trim: true}),
    password: v.string(),
})

export const actions = {
    default: enhance.action(async ({cookies, url, context: {form}}) => {
        const {email, password} = form.validate(schema)
        const redirectTo = url.searchParams.get('redirectTo') ?? '/';

        if (!email || !password) {
            return fail(400, {message: 'Email and password are required.', email});
        }

        const user = await Service('authentication').login({email, password}, {cookies});
        if (!user) {
            return fail(401, {message: 'Invalid email or password.', email});
        }

        throw redirect(303, redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/');
    }, Form.enhance)
};
