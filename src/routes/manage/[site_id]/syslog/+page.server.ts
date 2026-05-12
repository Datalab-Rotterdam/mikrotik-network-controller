import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';

export const load = enhance.load(async ({ parent }) => {
    const { site } = await parent();
    return { site };
}, SessionContext.ensure);
