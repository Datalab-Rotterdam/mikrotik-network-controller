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

	function invalidateDashboard() {
		void invalidate(`app:dashboard:${siteId}`);
	}

	function invalidateClients() {
		void invalidate(`app:clients:${siteId}`);
	}

	function invalidateAlerts() {
		void invalidate(`app:alerts:${siteId}`);
	}

	function invalidateTopology() {
		void invalidate(`app:topology:${siteId}`);
	}

	function handleEvent(event: ActionEvent) {
		switch (event.type) {
			case 'device.adopted':
				invalidateSiteDevices();
				invalidateDashboard();
				return;
			case 'device.updated':
				invalidateSiteDevices();
				invalidateDevice(event.payload.deviceId);
				invalidateDashboard();
				return;
			case 'device.removed':
				invalidateSiteDevices();
				invalidateDevice(event.payload.deviceId);
				invalidateDashboard();
				return;
			case 'client.updated':
				invalidateClients();
				return;
			case 'alert.fired':
			case 'alert.resolved':
				invalidateAlerts();
				return;
			case 'topology.updated':
				invalidateTopology();
				return;
		}
	}

	$effect(() =>
		actions.subscribe(
			['device.adopted', 'device.updated', 'device.removed', 'client.updated', 'alert.fired', 'alert.resolved', 'topology.updated'],
			handleEvent
		)
	);
</script>
