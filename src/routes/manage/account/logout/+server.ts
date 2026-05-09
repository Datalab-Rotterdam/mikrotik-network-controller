import {redirect} from '@sveltejs/kit';
import {Service} from "@sourceregistry/sveltekit-service-manager";

export async function POST(event) {
    await Service('authentication').logout(event);
    throw redirect(303, '/manage/account/login');
}
