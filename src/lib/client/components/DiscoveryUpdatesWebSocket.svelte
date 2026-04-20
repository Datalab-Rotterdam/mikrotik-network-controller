<script lang="ts">
	import WebSocket from '@sourceregistry/sveltekit-websockets';
	import { processDiscoveryWebSocketMessage, processDeviceAdopted, processDiscoveryNeighbor } from '$lib/client/stores/discovery-updates';
	import { devicesState } from '$lib/client/stores/devices';

	function handleMessage(event: MessageEvent<string>) {
		if (typeof event.data !== 'string') {
			return;
		}

		try {
			const message = JSON.parse(event.data);
			processDiscoveryWebSocketMessage(message);

			if ('type' in message && message.type === 'device.adopted' && message.payload) {
				processDeviceAdopted(message.payload);
			}

			if ('type' in message && message.type === 'discovery.neighbor' && message.payload) {
				processDiscoveryNeighbor(message.payload);
			}
		} catch {
			// Ignore invalid payloads.
		}
	}
</script>

<WebSocket url="/ws/discovery" onmessage={handleMessage} />
