<script lang="ts">
  import PageHeader from "$lib/client/components/primitives/PageHeader.svelte";
  import Card from "$lib/client/components/primitives/Card.svelte";
</script>

<PageHeader
  title="Syslog"
  subtitle="Local log ingestion and search for MikroTik devices."
/>

<Card title="Events">
  <div class="empty-state">Syslog ingestion is not enabled yet.</div>
</Card>

<style>
  .card {
    border: 1px solid var(--color-border);
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 180px;
    border: 1px dashed var(--color-border);
    border-radius: 8px;
    color: var(--color-muted);
    text-align: center;
  }
</style>
