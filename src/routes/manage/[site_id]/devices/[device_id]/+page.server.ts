import addFirewallRuleTask from "$lib/server/services/devices.service/tasks/add-firewall-rule.task";
import addVlanTask from "$lib/server/services/devices.service/tasks/add-vlan.task";
import backupDeviceTask from "$lib/server/services/devices.service/tasks/backup-device.task";
import checkFirmwareTask from "$lib/server/services/devices.service/tasks/check-firmware.task";
import deleteFirewallRuleTask from "$lib/server/services/devices.service/tasks/delete-firewall-rule.task";
import deleteVlanTask from "$lib/server/services/devices.service/tasks/delete-vlan.task";
import firmwareUpgradeTask from "$lib/server/services/devices.service/tasks/firmware-upgrade.task";
import renameDeviceTask from "$lib/server/services/devices.service/tasks/rename-device.task";
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { ClientRepository } from '$lib/server/repositories/clients.repository';
import { JobRepository } from '$lib/server/repositories/job.repository';
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import { resolveDeviceImage } from '$lib/server/services/devices.service/image-catalog';
import { isDeviceTerminalEligible } from '$lib/server/services/devices.service/terminal';
import { MetricsRepository } from '$lib/server/repositories/metrics.repository';
import { getDeviceBackups } from '$lib/server/services/devices.service/backup';
import { Service } from '@sourceregistry/sveltekit-service-manager';

import { FirmwareRepository } from '$lib/server/repositories/firmware.repository';
import { FirewallRepository } from '$lib/server/repositories/firewall.repository';
import { VlanRepository } from '$lib/server/repositories/vlan.repository';
import type { ActionJob, ActionJobStep } from '$lib/shared/action-events';
import { provisionDeviceAction, removeDeviceAction } from '../device-actions.server';
import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';

export const actions: Actions = {
	provision: enhance.action(provisionDeviceAction, SessionContext.require),
	remove: enhance.action(removeDeviceAction, SessionContext.require),
	rename: enhance.action(async ({ request, params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		const form = await request.formData();
		const name = (form.get('name') as string).trim();
		const manageIdentity = form.get('manageIdentity') === 'on';
		if (!name || name.length < 1 || name.length > 120)
			return fail(400, { success: false, message: 'Name is required (max 120 characters)' });
		try {
			// Update the controller-side name immediately
			await DeviceRepository.updateName(deviceId, name);

			// Schedule MikroTik identity change if requested
			let jobId: string | undefined;
			if (manageIdentity) {
				const job = await Service('scheduler').schedule(
					renameDeviceTask({ deviceId, name, siteId })
				);
				jobId = job.id;
			}

			return { success: true, message: `Renamed to "${name}"`, jobId };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require),
	backup: enhance.action(async ({ params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		try {
			const job = await Service('scheduler').schedule(backupDeviceTask(deviceId, siteId));
			return { success: true, message: 'Backup queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require),
	firmwareCheck: enhance.action(async ({ params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		try {
			const job = await Service('scheduler').schedule(checkFirmwareTask(deviceId, siteId));
			return { success: true, message: 'Firmware check queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require),
	firmwareUpgrade: enhance.action(async ({ params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		try {
			const job = await Service('scheduler').schedule(firmwareUpgradeTask(deviceId, siteId));
			return { success: true, message: 'Firmware upgrade queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require),
	addFirewallRule: enhance.action(async ({ request, params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		const form = await request.formData();
		const chain = form.get('chain') as string;
		const fwAction = form.get('fwAction') as string;
		const validChains = ['input', 'forward', 'output'];
		const validActions = ['accept', 'drop', 'reject', 'jump', 'return', 'passthrough', 'log'];
		if (!validChains.includes(chain)) return fail(400, { success: false, message: 'Invalid chain' });
		if (!validActions.includes(fwAction)) return fail(400, { success: false, message: 'Invalid action' });
		try {
			const job = await Service('scheduler').schedule(
				addFirewallRuleTask(deviceId, siteId, {
					chain: chain as 'input' | 'forward' | 'output',
					action: fwAction as 'accept' | 'drop' | 'reject' | 'jump' | 'return' | 'passthrough' | 'log',
					srcAddress: (form.get('srcAddress') as string) || null,
					dstAddress: (form.get('dstAddress') as string) || null,
					protocol: (form.get('protocol') as string) || null,
					srcPort: (form.get('srcPort') as string) || null,
					dstPort: (form.get('dstPort') as string) || null,
					inInterface: (form.get('inInterface') as string) || null,
					outInterface: (form.get('outInterface') as string) || null,
					comment: (form.get('comment') as string) || null
				})
			);
			return { success: true, message: 'Firewall rule queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require),
	deleteFirewallRule: enhance.action(async ({ request, params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		const form = await request.formData();
		const routerId = form.get('routerId') as string;
		if (!routerId) return fail(400, { success: false, message: 'routerId is required' });
		try {
			const job = await Service('scheduler').schedule(
				deleteFirewallRuleTask(deviceId, siteId, routerId)
			);
			return { success: true, message: 'Firewall rule removal queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require),
	addVlan: enhance.action(async ({ request, params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		const form = await request.formData();
		const vlanId = Number(form.get('vlanId'));
		const name = (form.get('name') as string).trim();
		const interfaceName = (form.get('interfaceName') as string).trim();
		const comment = (form.get('comment') as string) || null;
		if (!Number.isInteger(vlanId) || vlanId < 1 || vlanId > 4094)
			return fail(400, { success: false, message: 'VLAN ID must be 1–4094' });
		if (!name) return fail(400, { success: false, message: 'Name is required' });
		if (!interfaceName) return fail(400, { success: false, message: 'Interface name is required' });
		try {
			const job = await Service('scheduler').schedule(
				addVlanTask(deviceId, siteId, { vlanId, name, interfaceName, comment })
			);
			return { success: true, message: 'VLAN creation queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require),
	moveToSite: enhance.action(async ({ request, params }) => {
		const deviceId = params.device_id as string;
		const currentSiteId = params.site_id as string;
		const form = await request.formData();
		const targetSiteId = (form.get('targetSiteId') as string | null)?.trim();
		if (!targetSiteId) return fail(400, { success: false, message: 'Target site is required.' });
		if (targetSiteId === currentSiteId) return fail(400, { success: false, message: 'Device is already on this site.' });
		try {
			await DeviceRepository.updateSite(deviceId, targetSiteId);
			await ClientRepository.updateSiteForDevice(deviceId, targetSiteId);
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
		throw redirect(303, `/manage/${targetSiteId}/devices/${deviceId}`);
	}, SessionContext.require),

	deleteVlan: enhance.action(async ({ request, params }) => {
		const siteId = params.site_id as string;
		const deviceId = params.device_id as string;
		const form = await request.formData();
		const routerId = form.get('routerId') as string;
		if (!routerId) return fail(400, { success: false, message: 'routerId is required' });
		try {
			const job = await Service('scheduler').schedule(
				deleteVlanTask(deviceId, siteId, routerId)
			);
			return { success: true, message: 'VLAN removal queued', jobId: job.id };
		} catch (e) {
			return fail(500, { success: false, message: String(e) });
		}
	}, SessionContext.require)
};

function serializeDate(value: Date | string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeStep(
	step: NonNullable<Awaited<ReturnType<typeof JobRepository.getWithSteps>>>['steps'][number]
): ActionJobStep {
	return {
		id: step.id,
		jobId: step.jobId,
		index: step.index,
		name: step.name,
		status: step.status,
		result: step.result,
		errorMessage: step.errorMessage,
		revertResult: step.revertResult ?? null,
		revertErrorMessage: step.revertErrorMessage,
		startedAt: serializeDate(step.startedAt),
		finishedAt: serializeDate(step.finishedAt),
		revertedAt: serializeDate(step.revertedAt),
		createdAt: serializeDate(step.createdAt) ?? new Date(0).toISOString(),
		updatedAt: serializeDate(step.updatedAt) ?? new Date(0).toISOString()
	};
}

function serializeJob(job: NonNullable<Awaited<ReturnType<typeof JobRepository.getWithSteps>>>): ActionJob {
	return {
		id: job.id,
		type: job.type,
		status: job.status,
		deviceId: job.deviceId,
		siteId: job.siteId,
		requestedByUserId: job.requestedByUserId,
		progress: job.progress,
		attemptCount: job.attemptCount,
		maxAttempts: job.maxAttempts,
		payload: job.payload,
		result: job.result ?? null,
		errorMessage: job.errorMessage,
		scheduledFor: serializeDate(job.scheduledFor),
		lockedAt: serializeDate(job.lockedAt),
		lockedBy: job.lockedBy,
		startedAt: serializeDate(job.startedAt),
		finishedAt: serializeDate(job.finishedAt),
		createdAt: serializeDate(job.createdAt) ?? new Date(0).toISOString(),
		updatedAt: serializeDate(job.updatedAt) ?? new Date(0).toISOString(),
		steps: job.steps.map(serializeStep)
	};
}

type IfaceRow = { interfaceName: string; collectedAt: Date; rxBytes: number | null; txBytes: number | null };
type IfaceSample = { t: number; rx: number; tx: number };

function computeIfaceTraffic(rows: IfaceRow[]): Record<string, IfaceSample[]> {
	const grouped = new Map<string, IfaceRow[]>();
	for (const row of rows) {
		const arr = grouped.get(row.interfaceName) ?? [];
		arr.push(row);
		grouped.set(row.interfaceName, arr);
	}

	const result: Record<string, IfaceSample[]> = {};
	for (const [name, samples] of grouped) {
		// samples already ordered by collectedAt ASC from the query
		const deltas: IfaceSample[] = [];
		for (let i = 1; i < samples.length; i++) {
			const prev = samples[i - 1];
			const curr = samples[i];
			const dtMs = new Date(curr.collectedAt).getTime() - new Date(prev.collectedAt).getTime();
			if (dtMs <= 0) continue;
			const dtS = dtMs / 1000;
			const rxPrev = prev.rxBytes ?? 0;
			const rxCurr = curr.rxBytes ?? 0;
			const txPrev = prev.txBytes ?? 0;
			const txCurr = curr.txBytes ?? 0;
			// guard against counter resets
			const rx = rxCurr >= rxPrev ? (rxCurr - rxPrev) / dtS : 0;
			const tx = txCurr >= txPrev ? (txCurr - txPrev) / dtS : 0;
			deltas.push({ t: new Date(curr.collectedAt).getTime(), rx, tx });
		}
		// only include interfaces with any traffic or at least 2 samples
		if (deltas.length > 0) {
			result[name] = deltas;
		}
	}
	return result;
}

export async function load({ locals, parent, params, depends }) {
	const { site } = await parent();
	const deviceId = params.device_id as string;
	depends?.(`app:site-devices:${site.id}`);
	depends?.(`app:device:${deviceId}`);

	const device = await DeviceRepository.getByIdForSite(deviceId, site.id);

	if (!device) {
		throw redirect(303, `/manage/${site.id}/devices`);
	}

	const [interfaces, recentJobs, writeCredential, rawIfaceMetrics, backups, firmware, firewallRules, vlans] = await Promise.all([
		TelemetryRepository.listInterfaces(device.id),
		JobRepository.listByDevice(device.id, 20),
		TelemetryRepository.getActiveCredential(device.id, 'write'),
		MetricsRepository.getInterfaceHistory(device.id, 60 * 60 * 1000), // last 1h
		getDeviceBackups(device.id),
		FirmwareRepository.getVersion(device.id),
		FirewallRepository.listByDevice(device.id),
		VlanRepository.listByDevice(device.id)
	]);
	const hydratedJobs = await Promise.all(recentJobs.map((job) => JobRepository.getWithSteps(job.id)));

	// Group interface metrics by name and compute per-interval deltas
	const ifaceTraffic = computeIfaceTraffic(rawIfaceMetrics);

	return {
		device,
		deviceImage: resolveDeviceImage(device.model ?? device.identity ?? device.name, device.platform),
		interfaces,
		ifaceTraffic,
		backups,
		firmware,
		firewallRules,
		vlans,
		terminalAvailable: isDeviceTerminalEligible({
			userRoles: locals?.user?.roles ?? [],
			device,
			writeCredential
		}),
		jobs: hydratedJobs
			.filter((job): job is NonNullable<Awaited<ReturnType<typeof JobRepository.getWithSteps>>> => Boolean(job))
			.map(serializeJob)
	};
}
