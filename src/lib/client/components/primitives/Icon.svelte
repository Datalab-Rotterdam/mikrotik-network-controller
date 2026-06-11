<script lang="ts">
	import Icon from '$lib/client/primitives/Icon.svelte';
	import type { Props } from '$lib/client/primitives/Icon.svelte';

	let props: Props = $props();
</script>

<Icon {...props} />
