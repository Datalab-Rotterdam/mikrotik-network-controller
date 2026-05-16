import {AgentRepository} from "$lib/server/repositories/agent.repository";
import {DeviceRepository} from "$lib/server/repositories/device.repository";
import {Router, Service} from "@sourceregistry/sveltekit-service-manager/server";

const router = Router();

function rsc(body: string | string[]) {
    return new Response(Array.isArray(body)? body.join('\n'): body, {headers: {'content-type': 'text/plain; charset=utf-8'}});
}

router.GET("/bootstrap", async ({url, request}) => {
    const token = url.searchParams.get('token') ?? '';
    if (!token) {
        return new Response('Missing token', {status: 400});
    }

    const installToken = await AgentRepository.findValidToken(token);
    if (!installToken) {
        return new Response('Invalid or expired token', {status: 401});
    }

    // Create a placeholder device record so we can assign an agent token.
    // Host is a temporary placeholder — replaced at enroll/ack once device identity is known.
    const agentToken = Service('agent').generateToken();
    const placeholderHost = `pending-${token.slice(0, 12)}`;

    const device = await DeviceRepository.upsertAdopted({
        siteId: installToken.siteId,
        name: placeholderHost,
        platform: 'routeros',
        adoptionMode: 'read_only',
        adoptionState: 'discovered',
        connectionStatus: 'unknown',
        host: placeholderHost,
        apiPort: 8728,
        sshPort: 22,
        identity: null,
        model: null,
        serialNumber: null,
        routerOsVersion: null,
        architecture: null,
        uptimeSeconds: null,
        capabilities: [],
        tags: [],
        lastSeenAt: null,
        lastSyncAt: null
    });

    await DeviceRepository.setAgentToken(device.id, agentToken);
    await AgentRepository.claimToken(token, device.id);

    const origin = new URL(request.url).origin;
    const script = Service('agent').generateBootstrapAgentScript({
        controllerBaseUrl: origin,
        agentToken
    });
    return rsc(script);
})

router.GET('/checkin', async ({url, request}) => {
    const token = url.searchParams.get('token') ?? '';
    if (!token) {
        return rsc('# ctrl-agent: missing token');
    }

    const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        'unknown';

    const result = await Service('agent').handleCheckin(
        token,
        {
            identity: url.searchParams.get('identity') ?? undefined,
            cfgversion: url.searchParams.get('cfgversion') ?? undefined,
            version: url.searchParams.get('version') ?? undefined
        },
        clientIp
    );

    if (!result) {
        return rsc('# ctrl-agent: unknown token');
    }

    const lines: string[] = [];
    const checkinBase = `${url.origin}/api/v1/services/agent/checkin?token=${token}`;

    for (const cmd of result.commands) {
        if (cmd.type === 'script') {
            lines.push(cmd.body);
            // Update ctrlcfg source so next poll sends cfgversion as query param
            lines.push(`/system script set [find where name=ctrlcfg] source="${checkinBase}&cfgversion=${cmd.cfgversion}"`);
        }
    }

    lines.push(`/system scheduler set [find where name=ctrlagent] interval=${result.interval}s`);

    return rsc(lines);
})

export default router;
