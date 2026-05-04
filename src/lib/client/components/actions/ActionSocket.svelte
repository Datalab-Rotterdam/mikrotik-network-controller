<script lang="ts">
	import { setContext } from 'svelte';
	import ActionBus from '@sourceregistry/sveltekit-actionbus/ActionBus.svelte';
	import { createActionBus } from '$lib/client/actions/action-bus';
	import { ACTION_SOCKET_CONTEXT } from '$lib/client/actions/use-action-socket';
	import ActionBusBridge from './ActionBusBridge.svelte';

	let {
		children,
		siteId
	}: {
		children: import('svelte').Snippet;
		siteId: string;
	} = $props();

	const bus = createActionBus();
	setContext(ACTION_SOCKET_CONTEXT, bus);
</script>

<ActionBus url="/actionbus">
	<ActionBusBridge {siteId} />
	{@render children()}
</ActionBus>
