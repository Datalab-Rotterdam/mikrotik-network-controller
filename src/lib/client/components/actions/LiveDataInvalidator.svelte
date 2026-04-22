<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { useActionSocket } from '$lib/client/actions/use-action-socket';
	import type { ActionEvent } from '$lib/shared/action-events';

	let {
		siteId
	}: {
		siteId: string;
	} = $props();

	const actions = useActionSocket();

	function invalidateSiteDevices() {
		void invalidate(`app:site-devices:${siteId}`);
	}

	function invalidateDevice(deviceId: string) {
		void invalidate(`app:device:${deviceId}`);
	}

	function handleEvent(event: ActionEvent) {
		switch (event.type) {
			case 'device.adopted':
				invalidateSiteDevices();
				return;
			case 'device.updated':
				invalidateSiteDevices();
				invalidateDevice(event.payload.deviceId);
				return;
			case 'device.removed':
				invalidateSiteDevices();
				invalidateDevice(event.payload.deviceId);
				return;
		}
	}

	$effect(() =>
		actions.subscribe(['device.adopted', 'device.updated', 'device.removed'], handleEvent)
	);
</script>
