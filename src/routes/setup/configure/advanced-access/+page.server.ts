import {fail, redirect} from '@sveltejs/kit';
import {enhance, Form} from "@sourceregistry/sveltekit-enhance";
import {v} from "@sourceregistry/node-validator";
import {Service} from "@sourceregistry/sveltekit-service-manager";

export const load = ({url}) => {
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

const schema = v.object({
    controllerName: v.withDefault(v.string({trim: true}), 'Default'),
    country: v.withDefault(v.string({trim: true}), ''),
    email: v.string({trim: true}),
    displayName: v.string({trim: true}),
    password: v.refine(v.string(), (input) => input.length >= 12, 'Use at least 12 characters for the administrator password.'),
    confirmPassword: v.string(),
}, {unknownKeys: 'strip'})


export const actions = {
    default: enhance.action(async ({request, cookies, context: {form}}) => {
        const input = form.validate(schema);

        if (input.password !== input.confirmPassword) {
            return fail(400, {
                message: 'Password confirmation does not match.',
                email: input.email,
                displayName: input.displayName,
                controllerName: input.controllerName,
                country: input.country
            });
        }

        try {
            await Service('authentication').createFirstAdmin(
                {
                    email: input.email,
                    displayName: input.displayName,
                    password: input.password,
                    controllerName: input.controllerName,
                    country: input.country
                },
                {cookies}
            );
        } catch (error) {
            return fail(400, {
                message: error instanceof Error ? error.message : 'Unable to complete setup.',
                email: input.email,
                displayName: input.displayName,
                controllerName: input.controllerName,
                country: input.country
            });
        }

        throw redirect(303, '/');
    }, Form.enhance)
};
