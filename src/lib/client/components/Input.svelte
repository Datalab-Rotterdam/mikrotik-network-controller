<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type InputType = 'email' | 'hidden' | 'number' | 'password' | 'search' | 'text';

	let {
		label,
		name,
		type = 'text',
		value = '',
		autocomplete,
		inputmode,
		minlength,
		placeholder,
		required = false,
		compact = false
	}: {
		label?: string;
		name: string;
		type?: InputType;
		value?: string | number;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		inputmode?: HTMLInputAttributes['inputmode'];
		minlength?: number;
		placeholder?: string;
		required?: boolean;
		compact?: boolean;
	} = $props();
</script>

{#if type === 'hidden'}
	<input {name} {type} value={String(value)} />
{:else}
	<label class:compact class="field">
		{#if label}
			<span>{label}</span>
		{/if}
		<input
			{name}
			{type}
			value={String(value)}
			{autocomplete}
			{inputmode}
			{minlength}
			{placeholder}
			{required}
		/>
	</label>
{/if}

<style lang="scss">
	.field {
		display: grid;
		gap: 7px;
		color: #282a29;
		font-size: 14px;
		font-weight: 650;

		input {
			width: 100%;
			border: 1px solid var(--color-brand-light);
			border-radius: 6px;
			padding: 11px 12px;
			color: var(--color-brand);
			background: var(--color-surface);
		}

		input:focus {
			border-color: var(--color-brand);
			outline: 3px solid rgba(14, 14, 16, 0.14);
		}
	}

	.field.compact {
		gap: 4px;
		color: #72777a;
		font-size: 12px;
		font-weight: 500;

		input {
			min-height: 31px;
			border-color: #f0f1f3;
			border-radius: 3px;
			padding: 5px 10px;
			background: #f4f5f6;
		}
	}
</style>
