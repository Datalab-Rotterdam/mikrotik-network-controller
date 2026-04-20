<script lang="ts">
	import WebSocket from '@sourceregistry/sveltekit-websockets';
	import { processDiscoveryWebSocketMessage } from '$lib/client/stores/discovery-updates';

	function handleMessage(event: MessageEvent<string>) {
		if (typeof event.data !== 'string') {
			return;
		}

		try {
			const message = JSON.parse(event.data);
			processDiscoveryWebSocketMessage(message);
		} catch {
			// Ignore invalid payloads.
		}
	}
</script>

<WebSocket url="/ws/discovery" onmessage={handleMessage} />
