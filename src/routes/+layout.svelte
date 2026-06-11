<script lang="ts">
	import 'bootstrap-icons/font/bootstrap-icons.css';
	import '$lib/client-lib/styles/app.scss';
	import '$lib/client/styles/app.scss';
	import favicon from '$lib/assets/favicon.svg';
	import Toaster from "$lib/client-lib/components/toast/Toaster.svelte";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Mikrotik Network Controller</title>
</svelte:head>

{@render children?.()}
<Toaster/>
