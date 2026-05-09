import {NeighborDiscoveryService} from "@sourceregistry/mikrotik-client";
import env from "$lib/server/configurations/env.configuration";
import {Service} from "@sourceregistry/sveltekit-service-manager";

const mndp = new NeighborDiscoveryService({
    host: env.PUBLIC_DISCOVERY_HOST,
    port: env.PUBLIC_DISCOVERY_PORT,
    dedupe: true
})

mndp.on('neighbor', (neighbor) => {
    Service('actionbus').broadcast('discovery', {
        type: "discovery.neighbor",
        payload: {
            id: neighbor.id,
            identity: neighbor.identity,
            macAddress: neighbor.macAddress,
            platform: neighbor.platform,
            version: neighbor.version,
            hardware: neighbor.hardware,
            interfaceName: neighbor.interfaceName,
            address: neighbor.address,
        }
    })
})

export default await mndp.start()
