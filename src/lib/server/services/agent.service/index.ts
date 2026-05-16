import {type Service, ServiceManager} from "@sourceregistry/sveltekit-service-manager/server";
import crypto from 'crypto';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { AgentRepository } from '$lib/server/repositories/agent.repository';
import router from './routes';

export type AgentCommand =
	| { type: 'noop' }
	| { type: 'script'; cfgversion: string; body: string };

export type CheckinResponse = {
	interval: number;
	commands: AgentCommand[];
};

export type CheckinInput = {
	identity?: string;
	serial?: string;
	uptimeSeconds?: number;
	cfgversion?: string;
	version?: string;
};

function computeCfgversion(device: { updatedAt: Date | string }): string {
	return crypto
		.createHash('sha256')
		.update(String(device.updatedAt))
		.digest('hex')
		.slice(0, 16);
}

const service = {
	name: 'agent',
	route: router,
	local: {
		generateToken(): string {
			return crypto.randomBytes(32).toString('hex');
		},

		async handleCheckin(
			agentToken: string,
			input: CheckinInput,
			clientIp: string
		): Promise<CheckinResponse | null> {
			const device = await DeviceRepository.getByAgentToken(agentToken);
			if (!device) return null;

			await DeviceRepository.recordAgentCheckin(device.id, clientIp, input.cfgversion ?? null);

			const expected = computeCfgversion(device);
			const upToDate = input.cfgversion === expected;

			const interval = device.adoptionState === 'discovered' ? 30 : 60;

			if (upToDate) {
				return { interval, commands: [{ type: 'noop' }] };
			}

			// Push minimal config refresh — credentials already installed via ack;
			// for now just acknowledge the new cfgversion so device stays in sync.
			return {
				interval,
				commands: [
					{
						type: 'script',
						cfgversion: expected,
						body: `:log info ("ctrl-agent: cfgversion=" . "${expected}")`
					}
				]
			};
		},

		async createInstallToken(input: {
			siteId: string;
			createdByUserId: string;
		}): Promise<{ token: string; expiresAt: Date }> {
			const token = crypto.randomBytes(16).toString('hex');
			const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
			await AgentRepository.createInstallToken({ token, expiresAt, ...input });
			return { token, expiresAt };
		},

		async validateAndClaimInstallToken(
			token: string,
			deviceId: string
		): Promise<boolean> {
			const record = await AgentRepository.findValidToken(token);
			if (!record) return false;
			await AgentRepository.claimToken(token, deviceId);
			return true;
		},

		generateBootstrapAgentScript(input: {
			controllerBaseUrl: string;
			agentToken: string;
		}): string {
			const base = input.controllerBaseUrl.replace(/\/+$/, '');
			const checkinUrl = `${base}/api/v1/services/agent/checkin`;

			// Avoid ALL inner quotes inside source="..." parameters.
			// store the checkin URL (with token) in a separate script's source field (plain text, no quotes needed).
			// ctrlagent reads that source field at runtime -- no string literals needed in its own source.
			const agentSource =
				':local r [/system script get [find name=ctrlcfg] source]; ' +
				'/tool fetch url=\\$r output=file dst-path=ctrlr.rsc; ' +
				'/import file-name=ctrlr.rsc';

			// ctrlcfg source is just the URL -- no special chars that need escaping inside source="..."
			const cfgSource = `${checkinUrl}?token=${input.agentToken}`;

			return [
				':do { /system script remove ctrlcfg } on-error={}',
				':do { /system script remove ctrlagent } on-error={}',
				':do { /system scheduler remove ctrlagent } on-error={}',
				`/system script add name=ctrlcfg source="${cfgSource}"`,
				`/system script add name=ctrlagent source="${agentSource}"`,
				'/system scheduler add name=ctrlagent interval=60s on-event="/system script run ctrlagent" start-time=startup',
				'/system script run ctrlagent',
				':log info ctrl-agent-installed'
			].join('\n');
		}
	}
} satisfies Service<'agent'>

export type AgentService = typeof service;

export default ServiceManager.Load(service, import.meta);
