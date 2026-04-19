import {NeighborDiscoveryService} from "@sourceregistry/mikrotik-client";
import env from "$lib/server/configurations/env.configuration";

export default await new NeighborDiscoveryService({
    host: env.PUBLIC_DISCOVERY_HOST,
    port: env.PUBLIC_DISCOVERY_PORT,
    dedupe: true
}).start()
