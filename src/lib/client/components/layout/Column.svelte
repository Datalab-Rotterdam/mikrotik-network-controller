<script lang="ts">
    import type {Snippet} from 'svelte';

    type Sizes = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

    type Props = {
        children?: Snippet;
        name: string;
        xs?: number | 'none';
        sm?: number | 'none';
        md?: number | 'none';
        lg?: number | 'none';
        xl?: number | 'none';
        xxl?: number | 'none';
        order?: number;
        push?: number;
        pull?: number;
    };

    let {
        children,
        name,
        xs,
        sm,
        md,
        lg,
        xl,
        xxl,
        order,
        push,
        pull
    }: Props = $props();

    const className = $derived(
        [
            'column-layout-column',
            order === -9999 ? 'order-first' : '',
            order === 9999 ? 'order-last' : '',
            order !== undefined && order !== -9999 && order !== 9999 ? `order-${order}` : '',
            push !== undefined ? `push-${push}` : '',
            pull !== undefined ? `pull-${pull}` : ''
        ]
            .filter(Boolean)
            .join(' ')
    );
</script>

{#if children}
    <div class={className}>
        {@render children()}
    </div>
{/if}
