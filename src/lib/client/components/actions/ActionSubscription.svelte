<script lang="ts">
    import {useActionSocket} from '$lib/client/actions/use-action-socket';
    import type {ActionEvent, ActionEventType} from '$lib/shared/action-events';

    let {
        events,
        onEvent
    }: {
        events: ActionEventType[];
        onEvent: (event: ActionEvent) => void;
    } = $props();

    const actions = useActionSocket();

    $effect(() => actions.subscribe(events, (event) => onEvent(event)));
</script>
