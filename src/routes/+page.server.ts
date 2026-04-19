import websockets from "@sourceregistry/sveltekit-websockets/server"
import discoveryService from "$lib/server/services/discovery.service";


export const actions = {
    default: (event) => {
        const url = websockets.use(event, (ws) => {
            discoveryService.on('neighbor', (d) => {
                ws.send(JSON.stringify(d))
            })
        })
        return {url}
    }
}
