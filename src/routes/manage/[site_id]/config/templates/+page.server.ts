import { fail, redirect, type Actions } from '@sveltejs/kit';
import {
	listTemplates,
	getTemplate,
	createTemplate,
	updateTemplate,
	deleteTemplate,
} from '$lib/server/repositories/templates.repository';
import { extractPlaceholders, renderTemplate, diffConfigs } from '$lib/server/services/template-renderer.service';
import type { TemplateVariable } from '$lib/server/services/template-renderer.service';
import { listDevices } from '$lib/server/repositories/telemetry.repository';
import { Service } from '@sourceregistry/sveltekit-service-manager';
import { createConfigDeployTask } from '$lib/server/services/devices.service/modules/config/tasks';

export async function load({ parent, params, depends }) {
	const { site } = await parent();
	depends(`app:config-templates:${site.id}`);

	const [templates, devices] = await Promise.all([
		listTemplates(site.id),
		listDevices(site.id)
	]);

	const selectedId = (params as Record<string, string>).template_id ?? null;

	return { templates, selectedId, devices };
}

export const actions: Actions = {
	create: async ({ request, params }) => {
		const siteId = params.site_id as string;
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const description = String(data.get('description') ?? '').trim() || null;
		const platform = (String(data.get('platform') ?? 'routeros')) as 'routeros' | 'capsman';
		const content = String(data.get('content') ?? '');

		if (!name) return fail(400, { error: 'Name is required' });

		const placeholders = extractPlaceholders(content);
		const variables: TemplateVariable[] = placeholders.map((name) => ({
			name,
			label: name,
			type: 'string',
			required: false
		}));

		const template = await createTemplate({ siteId, name, description, platform, content, variables });
		return { success: true, templateId: template.id };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const description = String(data.get('description') ?? '').trim() || null;
		const platform = String(data.get('platform') ?? 'routeros') as 'routeros' | 'capsman';
		const content = String(data.get('content') ?? '');
		const variablesJson = String(data.get('variables') ?? '[]');

		if (!id) return fail(400, { error: 'Missing template id' });
		if (!name) return fail(400, { error: 'Name is required' });

		let variables: TemplateVariable[];
		try {
			variables = JSON.parse(variablesJson);
		} catch {
			variables = [];
		}

		// Merge any new placeholders found in content into the variable list
		const existingNames = new Set(variables.map((v) => v.name));
		for (const ph of extractPlaceholders(content)) {
			if (!existingNames.has(ph)) {
				variables.push({ name: ph, label: ph, type: 'string', required: false });
			}
		}

		const template = await updateTemplate(id, { name, description, platform, content, variables });
		if (!template) return fail(404, { error: 'Template not found' });
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing template id' });
		await deleteTemplate(id);
		return { success: true };
	},

	dryRun: async ({ request, locals }) => {
		const data = await request.formData();
		const templateId = String(data.get('templateId') ?? '');
		const variableValuesJson = String(data.get('variableValues') ?? '{}');

		if (!templateId) return fail(400, { error: 'Missing template id' });

		let variableValues: Record<string, string>;
		try {
			variableValues = JSON.parse(variableValuesJson);
		} catch {
			variableValues = {};
		}

		const template = await getTemplate(templateId);
		if (!template) return fail(404, { error: 'Template not found' });

		const { content: rendered, missingRequired } = renderTemplate(
			template.content,
			template.variables,
			variableValues
		);

		if (missingRequired.length > 0) {
			return fail(400, { error: `Missing required values: ${missingRequired.join(', ')}` });
		}

		const diffOutput = diffConfigs('', rendered);

		return { success: true, renderedContent: rendered, diff: diffOutput };
	},

	deploy: async ({ request, locals, params }) => {
		if (!locals.user) throw redirect(303, '/manage/account/login');

		const data = await request.formData();
		const templateId = String(data.get('templateId') ?? '');
		const deviceId = String(data.get('deviceId') ?? '');
		const variableValuesJson = String(data.get('variableValues') ?? '{}');

		if (!templateId) return fail(400, { error: 'Missing template id' });
		if (!deviceId) return fail(400, { error: 'Missing device id' });

		let variableValues: Record<string, string>;
		try {
			variableValues = JSON.parse(variableValuesJson);
		} catch {
			variableValues = {};
		}

		const siteId = params.site_id as string;

		try {
			const job = await Service('scheduler').schedule(
				createConfigDeployTask({ deviceId, templateId, variableValues, siteId })
			);

			return { success: true, message: 'Deployment queued', jobId: job.id };
		} catch (e) {
			return fail(500, {
				success: false,
				error: e instanceof Error ? e.message : 'Deployment failed'
			});
		}
	}
};
