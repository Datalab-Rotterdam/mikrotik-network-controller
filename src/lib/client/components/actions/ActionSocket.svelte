<script lang="ts">
	import { setContext } from 'svelte';
	import WebSocket from '@sourceregistry/sveltekit-websockets';
	import { createActionBus } from '$lib/client/actions/action-bus';
	import { ACTION_SOCKET_CONTEXT } from '$lib/client/actions/use-action-socket';
	import { processDiscoveryWebSocketMessage } from '$lib/client/stores/discovery-updates';
	import { processJobActionEvent } from '$lib/client/stores/jobs';
	import type { ActionEvent, ActionEventType } from '$lib/shared/action-events';

	let {
		children,
		siteId
	}: {
		children: import('svelte').Snippet;
		siteId: string;
	} = $props();

	const eventTypes = new Set<ActionEventType>([
		'job.snapshot',
		'job.updated',
		'discovery.snapshot',
		'discovery.neighbor',
		'device.adopted',
		'device.updated',
		'device.removed'
	]);
	const bus = createActionBus();
	setContext(ACTION_SOCKET_CONTEXT, bus);

	function isActionEvent(value: unknown): value is ActionEvent {
		return (
			typeof value === 'object' &&
			value !== null &&
			'type' in value &&
			typeof value.type === 'string' &&
			eventTypes.has(value.type as ActionEventType) &&
			'payload' in value
		);
	}

	function handleMessage(event: MessageEvent<string>) {
		if (typeof event.data !== 'string') {
			return;
		}

		try {
			const message: unknown = JSON.parse(event.data);
			if (!isActionEvent(message)) {
				return;
			}

			processJobActionEvent(message);
			processDiscoveryWebSocketMessage(message);
			bus.publish(message);
		} catch {
			// Ignore invalid websocket payloads.
		}
	}

	function handleOpen() {
		bus.setConnected(true);
	}

	function handleClose() {
		bus.setConnected(false);
	}

	function handleError(event: Event | undefined) {
		bus.setError(event?.type ?? 'WebSocket error');
	}
</script>

<WebSocket
	url={`/ws/controller?siteId=${encodeURIComponent(siteId)}`}
	onmessage={handleMessage}
	onopen={handleOpen}
	onclose={handleClose}
	onerror={handleError}
/>

{@render children()}
