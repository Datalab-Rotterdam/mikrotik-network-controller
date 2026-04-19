<script lang="ts">
	import SetupSplit from '$lib/client/components/SetupSplit.svelte';

	let { children } = $props();
</script>

<SetupSplit imageSrc="/images/ethernet_routers_600.webp" imageAlt="MikroTik routers and switches">
	{@render children()}
</SetupSplit>
