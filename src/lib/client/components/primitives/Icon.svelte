<script lang="ts">
	import { ICONS, type IconName } from './icons';

	let {
		name,
		size = 24,
		class: className,
	}: {
		name: IconName;
		size?: number;
		class?: string;
	} = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	aria-hidden="true"
	class={className}
>
	{#if name === 'gear'}
		<path
			d="M9.59 3.38A2 2 0 0 1 11.55 2h.9a2 2 0 0 1 1.96 1.38l.28.9c.12.38.4.7.75.88l.5.29c.34.22.76.3 1.15.2l.92-.2a2 2 0 0 1 2.23 1.1l.44.78a2 2 0 0 1-.29 2.47l-.64.7c-.27.29-.4.69-.39 1.1v.8c-.01.41.12.81.39 1.1l.64.7a2 2 0 0 1 .29 2.47l-.44.78a2 2 0 0 1-2.23 1.1l-.92-.2c-.39-.1-.81-.02-1.15.2l-.5.29c-.35.18-.63.5-.75.88l-.28.9A2 2 0 0 1 12.45 22h-.9a2 2 0 0 1-1.96-1.38l-.28-.9a1.74 1.74 0 0 0-.75-.88l-.5-.29a1.73 1.73 0 0 0-1.15-.2l-.92.2a2 2 0 0 1-2.23-1.1l-.44-.78a2 2 0 0 1 .29-2.47l.64-.7c.27-.29.4-.69.39-1.1v-.8c.01-.41-.12-.81-.39-1.1l-.64-.7a2 2 0 0 1-.29-2.47l.44-.78a2 2 0 0 1 2.23-1.1l.92.2c.39.1.81.02 1.15-.2l.5-.29c.35-.18.63-.5.75-.88l.28-.9Z"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else}
		<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d={ICONS[name]} />
	{/if}
</svg>

<style>
	svg {
		display: block;
	}
</style>
