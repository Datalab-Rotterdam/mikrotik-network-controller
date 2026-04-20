import {Router, type Service, ServiceManager, Action} from "@sourceregistry/sveltekit-service-manager";

import {adoption, telemetry, provisioning, credentials} from "./modules";

const router = Router();

// Bootstrap / adoption
router.POST("/enroll", async ({request}) => {
    const body = await request.json();

    const result = await service.local.adoption.enroll(body);
    return Action.success(200, result);
});
router.GET("/bootstrap/controller.pub", async () => {
    const key = await service.local.adoption.getControllerPublicKey();

    return new Response(key + "\n", {
        headers: {
            "content-type": "text/plain; charset=utf-8"
        }
    });
});
router.POST("/bootstrap/ack", async ({request}) => {
    const body = await request.json();

    const result = await service.local.adoption.ack(body);
    return Action.success(200, result);
});

// Telemetry / reads
router.GET("/", async () => {
    return Action.success(200, await service.local.telemetry.list());
});
router.GET("/[serial]", async ({params}) => {
    const result = await service.local.telemetry.get(params.serial);

    if (!result) {
        return Action.error(404, {message: "Device not found"});
    }

    return Action.success(200, result);
});
router.GET("/[serial]/stats", async ({params}) => {
    const result = await service.local.telemetry.stats(params.serial);
    return Action.success(200, result);
});

export const service = {
    name: "devices",
    route: router,
    local: {
        adoption,
        telemetry,
        provisioning,
        credentials
    }
} satisfies Service<"devices">;

export type DevicesService = typeof service;

export default ServiceManager.Load(service, import.meta);
