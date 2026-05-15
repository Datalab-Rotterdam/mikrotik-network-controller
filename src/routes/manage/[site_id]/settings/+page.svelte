<script lang="ts">
  import {PageHeader} from "$lib/client/components/layout/Page";
  import Card from "$lib/client/components/primitives/Card.svelte";
  import ResponsiveGrid from "$lib/client/components/layout/ResponsiveGrid.svelte";
  import { Page } from "$lib/client/components/layout";
</script>

<Page>
  <PageHeader
    title="Settings"
    subtitle="Controller security, local operation, and access management."
  />

  <ResponsiveGrid min="160px">
    <Card>
      <span class="metric-label">Authentication</span>
      <strong>Local</strong>
    </Card>
    <Card>
      <span class="metric-label">RBAC</span>
      <strong>Ready</strong>
    </Card>
    <Card>
      <span class="metric-label">MFA</span>
      <strong>Planned</strong>
    </Card>
    <Card>
      <span class="metric-label">Storage</span>
      <strong>Local</strong>
    </Card>
  </ResponsiveGrid>
</Page>

<style>
  .metric-label {
    color: var(--color-muted);
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .card strong {
    display: block;
    margin-top: 10px;
    font-size: 30px;
  }

</style>
