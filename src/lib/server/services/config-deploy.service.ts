import { and, eq } from 'drizzle-orm';
import { join } from 'node:path';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { RouterOSClient, RouterOSSshClient } from '@sourceregistry/mikrotik-client/routeros';
import { getDeviceById, getDeviceCredentials } from '$lib/server/repositories/telemetry.repository';
import { decryptSecret } from '$lib/server/security/secrets';
import {
	getTemplate,
	createDeployment,
} from '$lib/server/repositories/templates.repository';
import { db } from '$lib/server/db/client';
import { configDeployments } from '$lib/server/db/schema';
import { renderTemplate, diffConfigs } from '$lib/server/services/template-renderer.service';

export type DeployMode = 'dry-run' | 'apply';

export type DeployVariableValues = Record<string, string>;

export type DeployDryRunResult = {
	mode: 'dry-run';
	renderedContent: string;
	diff: string;
};

export type DeployApplyResult = {
	mode: 'apply';
	deploymentId: string;
	configBackupId?: string;
	steps: string[];
};

export type ConfigDeployResult = DeployDryRunResult | DeployApplyResult;

const DATA_DIR = '.data/config-deploys';
const CLIENT_TIMEOUT_MS = 30_000;
const SSH_TIMEOUT_MS = 30_000;

/**
 * Render a template and push the rendered config to a RouterOS device.
 * For dry-run mode, returns the diff without touching the device.
 * For apply mode, writes a .rsc file on the device and imports it via RouterOS API.
 */
export async function deployConfig({
	templateId,
	deviceId,
	variableValues,
	mode = 'dry-run',
}: {
	templateId: string;
	deviceId: string;
	variableValues: DeployVariableValues;
	mode?: DeployMode;
}): Promise<ConfigDeployResult> {
	const template = await getTemplate(templateId);
	if (!template) {
		throw new Error(`Template ${templateId} not found`);
	}

	const { content: renderedContent, missingRequired } = renderTemplate(
		template.content,
		template.variables,
		variableValues
	);

	if (missingRequired.length > 0) {
		throw new Error(`Missing required variable values: ${missingRequired.join(', ')}`);
	}

	const device = await getDeviceById(deviceId);
	if (!device) {
		throw new Error(`Device ${deviceId} not found`);
	}

	if (device.platform !== 'routeros') {
		throw new Error(`Deployment requires a RouterOS device (got: ${device.platform})`);
	}

	if (mode === 'dry-run') {
		return await buildDryRun(device, renderedContent);
	}

	return await doApply(device, deviceId, templateId, renderedContent, variableValues);
}

async function buildDryRun(
	device: Awaited<ReturnType<typeof getDeviceById>>,
	renderedContent: string
): Promise<DeployDryRunResult> {
	const currentConfig = await fetchCurrentConfig(device);
	const diff = diffConfigs(currentConfig, renderedContent);
	return { mode: 'dry-run', renderedContent, diff };
}

async function doApply(
	device: Awaited<ReturnType<typeof getDeviceById>>,
	deviceId: string,
	templateId: string,
	renderedContent: string,
	variableValues: DeployVariableValues
): Promise<DeployApplyResult> {
	const credentials = await getDeviceCredentials(deviceId);
	const writeCred = credentials.find((c) => c.purpose === 'write');

	const steps: string[] = [];

	// Determine authentication method
	let configBackupId: string | undefined;
	const tempName = `controller-deploy-${Date.now()}.rsc`;

	try {
		if (writeCred) {
			// SSH key-based deployment (preferred for managed devices)
			return await deployViaSSH(device, deviceId, templateId, renderedContent, variableValues, writeCred, tempName, steps);
		}

		// Fallback: password-based API deployment
		const apiCred = credentials.find((c) => c.purpose === 'backup')
			?? credentials.find((c) => c.purpose === 'read_only');

		if (!apiCred) {
			throw new Error('No credential available for deployment');
		}

		return await deployViaAPI(device, deviceId, templateId, renderedContent, variableValues, apiCred, tempName, steps, configBackupId);

	} finally {
		// Cleanup temp file on device
		await cleanupTempFile(device, credentials, tempName);
	}
}

async function deployViaSSH(
	device: Awaited<ReturnType<typeof getDeviceById>>,
	deviceId: string,
	templateId: string,
	renderedContent: string,
	variableValues: DeployVariableValues,
	writeCred: { username: string; secretEncrypted: string },
	tempName: string,
	steps: string[]
): Promise<DeployApplyResult> {
	// Use SSH key path if credential is SSH key marker
	const secret = decryptSecret(writeCred.secretEncrypted);
	const isSSHKey = secret.startsWith('ssh-key:');

	if (isSSHKey) {
		const { getControllerSshPrivateKeyPath } = await import('$lib/server/security/controller-ssh-keys');
		const privateKeyPath = await getControllerSshPrivateKeyPath();

		const ssh = new RouterOSSshClient({
			host: device.host,
			username: writeCred.username,
			identityFile: privateKeyPath,
			port: device.sshPort,
			timeoutMs: SSH_TIMEOUT_MS
		});

		try {
			// Write config to temp file via SSH
			const escapedContent = renderedContent.replace(/'/g, "'\\''");
			await ssh.execute(`cat > ${tempName} << 'DEPLOY_EOF'\n${renderedContent}\nDEPLOY_EOF`);
			steps.push('Config written to temp file via SSH');

			// Import the config
			await ssh.execute(`/import file=${tempName}`);
			steps.push('Config imported on device');
		} catch {
			// SSH session cleanup on error (no close() method on RouterOSSshClient)
		}
	}

	// Create deployment record
	const deployment = await createDeployment({
		templateId,
		deviceId,
		jobId: null,
		renderedContent,
		variables: variableValues,
		result: { mode: 'apply', steps, success: true }
	});

	return { mode: 'apply', deploymentId: deployment.id, steps };
}

async function deployViaAPI(
	device: Awaited<ReturnType<typeof getDeviceById>>,
	deviceId: string,
	templateId: string,
	renderedContent: string,
	variableValues: DeployVariableValues,
	apiCred: { username: string; secretEncrypted: string },
	tempName: string,
	steps: string[],
	_configBackupId?: string
): Promise<DeployApplyResult> {
	const client = new RouterOSClient({
		host: device.host,
		port: device.apiPort,
		username: apiCred.username,
		password: decryptSecret(apiCred.secretEncrypted),
		timeoutMs: CLIENT_TIMEOUT_MS
	});

	try {
		// Write the rendered config as a .rsc file on the device
		await client.execute('/file/add', {
			attributes: {
				'directory': '/disk/',
				'name': tempName,
				'content': renderedContent
			}
		});
		steps.push('Config written to temp file on device');

		// Import the config
		await client.execute('/import', {
			attributes: {
				'file': tempName
			}
		});
		steps.push('Config imported on device');
	} finally {
		await client.close().catch(() => {});
	}

	// Create deployment record
	const deployment = await createDeployment({
		templateId,
		deviceId,
		jobId: null,
		renderedContent,
		variables: variableValues,
		result: { mode: 'apply', steps, success: true }
	});

	return { mode: 'apply', deploymentId: deployment.id, steps };
}

async function fetchCurrentConfig(device: Awaited<ReturnType<typeof getDeviceById>>): Promise<string> {
	const credentials = await getDeviceCredentials(device.id);
	const cred = credentials.find((c) => c.purpose === 'backup')
		?? credentials.find((c) => c.purpose === 'read_only');

	if (!cred) return '';

	const client = new RouterOSClient({
		host: device.host,
		port: device.apiPort,
		username: cred.username,
		password: decryptSecret(cred.secretEncrypted),
		timeoutMs: CLIENT_TIMEOUT_MS
	});

	try {
		const result = await client.execute('/export', {}) as unknown;
		return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
	} finally {
		await client.close().catch(() => {});
	}
}

async function cleanupTempFile(
	device: Awaited<ReturnType<typeof getDeviceById>>,
	credentials: Awaited<ReturnType<typeof getDeviceCredentials>>,
	tempName: string
): Promise<void> {
	const cred = credentials.find((c) => c.purpose === 'write')
		?? credentials.find((c) => c.purpose === 'backup')
		?? credentials.find((c) => c.purpose === 'read_only');

	if (!cred) return;

	try {
		const client = new RouterOSClient({
			host: device.host,
			port: device.apiPort,
			username: cred.username,
			password: decryptSecret(cred.secretEncrypted),
			timeoutMs: 10_000
		});

		await client.execute('/file/remove', { attributes: { 'file': tempName } });
		await client.close().catch(() => {});
	} catch {
		// Non-critical cleanup
	}
}
