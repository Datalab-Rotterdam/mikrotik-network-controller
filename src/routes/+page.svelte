<script lang="ts">
    import WebSocket from "@sourceregistry/sveltekit-websockets/client";


</script>


<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>


<WebSocket action="/?">
    {#snippet message(t)}
        {JSON.stringify(t)}
    {/snippet}
</WebSocket>
