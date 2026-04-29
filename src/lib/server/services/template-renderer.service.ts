export type TemplateVariable = {
	name: string;
	label: string;
	type: string;
	default?: string;
	required?: boolean;
};

export type RenderResult = {
	content: string;
	missingRequired: string[];
};

/** Replace `{{variable_name}}` placeholders with provided values. */
export function renderTemplate(
	content: string,
	variables: TemplateVariable[],
	values: Record<string, string>
): RenderResult {
	const missingRequired: string[] = [];
	let rendered = content;

	for (const variable of variables) {
		const value = values[variable.name] ?? variable.default ?? '';
		if (!value && variable.required) {
			missingRequired.push(variable.name);
		}
		rendered = rendered.replaceAll(`{{${variable.name}}}`, value);
	}

	// Strip any remaining unresolved placeholders that aren't defined in variables
	rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

	return { content: rendered, missingRequired };
}

/** Extract all `{{variable_name}}` tokens from a template string. */
export function extractPlaceholders(content: string): string[] {
	const matches = content.matchAll(/\{\{([^}]+)\}\}/g);
	return [...new Set([...matches].map((m) => m[1].trim()))];
}

/** Compute a line-by-line diff between two config strings for dry-run display. */
export function diffConfigs(original: string, updated: string): string {
	const originalLines = original.split('\n');
	const updatedLines = updated.split('\n');

	const lines: string[] = [];
	const maxLen = Math.max(originalLines.length, updatedLines.length);

	for (let i = 0; i < maxLen; i++) {
		const orig = originalLines[i];
		const upd = updatedLines[i];
		if (orig === upd) {
			lines.push(`  ${upd ?? ''}`);
		} else if (orig !== undefined && upd === undefined) {
			lines.push(`- ${orig}`);
		} else if (orig === undefined && upd !== undefined) {
			lines.push(`+ ${upd}`);
		} else {
			lines.push(`- ${orig}`);
			lines.push(`+ ${upd}`);
		}
	}

	return lines.join('\n');
}
