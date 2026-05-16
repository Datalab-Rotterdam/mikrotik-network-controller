<script lang="ts">

    import {Page, PageHeader} from "$lib/client/components/layout";
    import ResponsiveGrid from "$lib/client/components/layout/ResponsiveGrid.svelte";
    import Card from "$lib/client/components/primitives/Card.svelte";
</script>

<Page>
    <PageHeader
            title="Network"
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
