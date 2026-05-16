import type { DeviceEventMap } from '$lib/server/services/devices.service/emitter';
import type { AnyEventEmitter } from '$lib/server/utilities/AnyEventEmitter';
import {ServiceRouter} from "@sourceregistry/sveltekit-service-manager";

export {default as adoption} from "./adoption/index.ts"
export {default as telemetry} from "./telemetry.module.ts"
export {default as provisioning} from "./provisioning.module.ts"
export {default as credentials} from "./credentials.module.ts"
export {default as removal} from "./removal.module.ts"
export {default as config} from "./config.module.ts"
export {default as terminal} from "./terminal.module.ts"

export type ServiceModuleContext = {
    get router(): ServiceRouter
    get eventEmitter(): AnyEventEmitter<DeviceEventMap>
}
