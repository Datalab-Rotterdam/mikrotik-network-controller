// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {DevicesService} from "$lib/server/services/devices.service";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user: import('$lib/server/services/auth.service').AuthenticatedUser | null;
        }

        interface PageData {
            user: import('$lib/server/services/auth.service').AuthenticatedUser | null;
            pathname?: string;
        }

        interface Services {
            devices: DevicesService
        }

        // interface PageState {}
        // interface Platform {}
    }
}

export {};
