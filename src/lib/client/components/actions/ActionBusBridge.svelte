<script lang="ts">
	import { subscribe } from '@sourceregistry/sveltekit-actionbus/ActionBus.svelte';
	import { useActionSocket } from '$lib/client/actions/use-action-socket';
	import { processDiscoveryWebSocketMessage } from '$lib/client/stores/discovery-updates';
	import { processJobActionEvent } from '$lib/client/stores/jobs';

	let {
		siteId
	}: {
		siteId: string;
	} = $props();

	const bus = useActionSocket();
	const siteChannel = $derived(`site:${siteId}` as const);
	// svelte-ignore state_referenced_locally
	const subscription = subscribe(siteChannel, 'discovery');
	let handledEventCount = 0;

	$effect(() => {
		const unsubscribeEvents = subscription.events.subscribe((messages) => {
			for (const message of messages.slice(handledEventCount)) {
				processJobActionEvent(message.event);
				processDiscoveryWebSocketMessage(message.event);
				bus.publish(message.event);
			}

			handledEventCount = messages.length;
		});

		const unsubscribeState = subscription.state.subscribe((state) => {
			if (state.connected) {
				bus.setConnected(true);
				return;
			}

			if (state.lastError) {
				bus.setError(state.lastError);
				return;
			}

			bus.setConnected(false);
		});

		return () => {
			unsubscribeEvents();
			unsubscribeState();
			subscription.close();
		};
	});
</script>
