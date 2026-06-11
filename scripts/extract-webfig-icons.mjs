import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const cssPath = path.join(root, 'ext/mikrotik-webfig/assets/style-abdf294b3154.css');
const registryDir = path.join(root, 'src/lib/client/icons/webfig');
const svgDir = path.join(root, 'scripts/webfig-icons');

const css = await readFile(cssPath, 'utf8');
const standaloneSvgColors = {
	'--webfig-icon-primary': '#145656',
	'--webfig-icon-accent': '#3ca384',
	'--icon-color': '#145656',
	'--icon-accent': '#3ca384'
};

const iconPattern =
	/([^{}]*\.icon-[^{}]*)\{[^{}]*background-image:\s*url\("data:image\/svg\+xml;charset=UTF-8,([^"\r\n]+)"\)[^{}]*\}/g;

const icons = [];
const usedIconNames = new Map();
let match;

while ((match = iconPattern.exec(css))) {
	const selector = match[1];
	const selectorMatch = selector.match(/\.icon-([A-Za-z0-9_-]+)((?:\.[A-Za-z0-9_-]+)*)/);
	if (!selectorMatch) continue;

	const stateSuffix = selectorMatch[2]?.replace(/\./g, '_') ?? '';
	const baseName = `${selectorMatch[1]}${stateSuffix}`;
	const previousUseCount = usedIconNames.get(baseName) ?? 0;
	usedIconNames.set(baseName, previousUseCount + 1);
	const name = previousUseCount === 0 ? baseName : `${baseName}_${previousUseCount + 1}`;
	const svg = decodeURIComponent(match[2])
		.replace(/#145656/gi, 'var(--webfig-icon-primary, var(--icon-color))')
		.replace(/#3ca384/gi, 'var(--webfig-icon-accent, var(--icon-accent))')
		.replace(/\s+/g, ' ')
		.trim();

	icons.push({ name, svg });
}

icons.sort((a, b) => a.name.localeCompare(b.name));

await mkdir(registryDir, { recursive: true });
await mkdir(svgDir, { recursive: true });

const quote = (value) => JSON.stringify(value);
const escapeHtml = (value) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
const resolveStandaloneSvg = (svg) =>
	svg.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*var\(\s*(--[A-Za-z0-9_-]+)\s*\))?\s*\)/g, (_, name, fallbackName) => {
		return standaloneSvgColors[name] ?? standaloneSvgColors[fallbackName] ?? 'currentColor';
	});

const registry = `// Generated from ext/mikrotik-webfig/assets/style-abdf294b3154.css.
// Do not edit icon data by hand; rerun scripts/extract-webfig-icons.mjs when upstream changes.

export const webfigIcons = {
${icons.map(({ name, svg }) => `\t${quote(name)}: ${quote(svg)}`).join(',\n')}
} as const;

export type WebFigIconName = keyof typeof webfigIcons;

export const webfigIconNames = Object.keys(webfigIcons) as WebFigIconName[];
`;

await writeFile(path.join(registryDir, 'webfig-icons.ts'), registry, 'utf8');

for (const icon of icons) {
	await writeFile(path.join(svgDir, `${icon.name}.svg`), `${resolveStandaloneSvg(icon.svg)}\n`, 'utf8');
}

const gallery = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WebFig Icons</title>
  <style>
    :root {
      color: #143c3c;
      background: #f7faf9;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 24px;
      line-height: 1.2;
    }

    p {
      margin: 0 0 24px;
      color: #5c7373;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }

    .icon {
      display: grid;
      grid-template-rows: 56px auto;
      align-items: center;
      justify-items: center;
      gap: 10px;
      min-width: 0;
      padding: 16px 12px 14px;
      border: 1px solid #d9e5e2;
      border-radius: 8px;
      background: #fff;
    }

    .icon img {
      width: 32px;
      height: 32px;
      object-fit: contain;
      image-rendering: auto;
    }

    .icon-name {
      width: 100%;
      overflow-wrap: anywhere;
      color: #254747;
      font-size: 12px;
      line-height: 1.3;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>WebFig Icons</h1>
  <p>${icons.length} generated SVG icons.</p>
  <main class="grid">
${icons
	.map(
		({ name }) => `    <figure class="icon">
      <img src="./${encodeURIComponent(name)}.svg" alt="${escapeHtml(name)}">
      <figcaption class="icon-name">${escapeHtml(name)}</figcaption>
    </figure>`
	)
	.join('\n')}
  </main>
</body>
</html>
`;

await writeFile(path.join(svgDir, 'index.html'), gallery, 'utf8');

console.log(`Extracted ${icons.length} WebFig icons, SVG files, and gallery page.`);
