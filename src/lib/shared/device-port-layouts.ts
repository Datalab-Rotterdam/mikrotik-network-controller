import catalog from '../../../static/mikrotik_products_catalog.json';

export type DevicePortInterface = {
	id?: string;
	name: string;
	type?: string | null;
	macAddress?: string | null;
	comment?: string | null;
	running: boolean;
	disabled: boolean;
};

export type DevicePortKind =
	| 'ethernet'
	| 'sfp'
	| 'sfp+'
	| 'sfp28'
	| 'qsfp+'
	| 'qsfp28'
	| 'combo'
	| 'wireless'
	| 'virtual'
	| 'unknown';

export type DevicePortState = 'active' | 'inactive' | 'disabled' | 'uncollected';

export type PortDefinition = {
	name: string;
	label?: string;
	kind?: DevicePortKind;
	speed?: string;
};

export type PortLayoutGroup = {
	id: string;
	label: string;
	kind?: DevicePortKind;
	speed?: string;
	rows: PortDefinition[][];
};

export type PortLayoutEntry = {
	model: string;
	aliases: string[];
	groups: PortLayoutGroup[];
};

export type ResolvedPort = PortDefinition & {
	key: string;
	state: DevicePortState;
	interface?: DevicePortInterface;
};

export type ResolvedPortGroup = Omit<PortLayoutGroup, 'rows'> & {
	rows: ResolvedPort[][];
};

export type ResolvedDevicePortLayout = {
	source: 'model' | 'fallback';
	model?: string;
	groups: ResolvedPortGroup[];
};

type CatalogProduct = {
	product_code: string;
	name: string;
};

const products = (catalog.products ?? []) as CatalogProduct[];

function normalizeIdentifier(value: string | undefined | null) {
	return (value ?? '')
		.toLowerCase()
		.replace(/\+/g, 'plus')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function port(name: string, kind: DevicePortKind, speed: string, label = name): PortDefinition {
	return { name, label, kind, speed };
}

function range(prefix: string, start: number, end: number, kind: DevicePortKind, speed: string): PortDefinition[] {
	return Array.from({ length: end - start + 1 }, (_, index) => {
		const number = start + index;
		return port(`${prefix}${number}`, kind, speed, String(number));
	});
}

function oddEvenRows(prefix: string, start: number, end: number, kind: DevicePortKind, speed: string) {
	const ports = range(prefix, start, end, kind, speed);
	return [
		ports.filter((_, index) => (start + index) % 2 === 1),
		ports.filter((_, index) => (start + index) % 2 === 0)
	];
}

const rb5009Rows = [
	[
		port('ether1', 'ethernet', '2.5 Gbps', '1'),
		port('ether3', 'ethernet', '1 Gbps', '3'),
		port('ether5', 'ethernet', '1 Gbps', '5'),
		port('ether7', 'ethernet', '1 Gbps', '7'),
		port('sfp-sfpplus1', 'sfp+', '10 Gbps', 'SFP+')
	],
	[
		port('ether2', 'ethernet', '1 Gbps', '2'),
		port('ether4', 'ethernet', '1 Gbps', '4'),
		port('ether6', 'ethernet', '1 Gbps', '6'),
		port('ether8', 'ethernet', '1 Gbps', '8')
	]
];

export const portLayoutCatalog: PortLayoutEntry[] = [
	{
		model: 'CSS326-24G-2S+',
		aliases: ['CSS326-24G-2S+', 'CSS326-24G-2S+RM', 'CRS326-24G-2S+IN', 'CRS326-24G-2S+RM'],
		groups: [
			{ id: 'ethernet', label: 'Ethernet', kind: 'ethernet', speed: '1 Gbps', rows: oddEvenRows('ether', 1, 24, 'ethernet', '1 Gbps') },
			{ id: 'sfp', label: 'SFP+', kind: 'sfp+', speed: '10 Gbps', rows: [[port('sfp-sfpplus1', 'sfp+', '10 Gbps', 'SFP+1'), port('sfp-sfpplus2', 'sfp+', '10 Gbps', 'SFP+2')]] }
		]
	},
	{
		model: 'CRS328-24P-4S+RM',
		aliases: ['CRS328-24P-4S+RM'],
		groups: [
			{ id: 'poe', label: 'PoE Ethernet', kind: 'ethernet', speed: '1 Gbps', rows: oddEvenRows('ether', 1, 24, 'ethernet', '1 Gbps') },
			{
				id: 'sfp',
				label: 'SFP+',
				kind: 'sfp+',
				speed: '10 Gbps',
				rows: [[
					port('sfp-sfpplus1', 'sfp+', '10 Gbps', 'SFP+1'),
					port('sfp-sfpplus2', 'sfp+', '10 Gbps', 'SFP+2'),
					port('sfp-sfpplus3', 'sfp+', '10 Gbps', 'SFP+3'),
					port('sfp-sfpplus4', 'sfp+', '10 Gbps', 'SFP+4')
				]]
			}
		]
	},
	{
		model: 'CRS112-8P-4S-IN',
		aliases: ['CRS112-8P-4S-IN'],
		groups: [
			{ id: 'poe', label: 'PoE Ethernet', kind: 'ethernet', speed: '1 Gbps', rows: oddEvenRows('ether', 1, 8, 'ethernet', '1 Gbps') },
			{ id: 'sfp', label: 'SFP', kind: 'sfp', speed: '1 Gbps', rows: [range('sfp', 1, 4, 'sfp', '1 Gbps')] }
		]
	},
	{
		model: 'RB5009UG+S+IN',
		aliases: ['RB5009UG+S+IN', 'RB5009UPr+S+IN', 'RB5009UPr+S+OUT'],
		groups: [{ id: 'front', label: 'Front panel', rows: rb5009Rows }]
	},
	{
		model: 'hEX',
		aliases: ['hEX', 'RB750Gr3', 'E50UG'],
		groups: [{ id: 'ethernet', label: 'Ethernet', kind: 'ethernet', speed: '1 Gbps', rows: [range('ether', 1, 5, 'ethernet', '1 Gbps')] }]
	},
	{
		model: 'hAP ax3',
		aliases: ['hAP ax3', 'C53UiG+5HPaxD2HPaxD'],
		groups: [
			{
				id: 'ethernet',
				label: 'Ethernet',
				rows: [[
					port('ether1', 'ethernet', '2.5 Gbps', '1'),
					...range('ether', 2, 5, 'ethernet', '1 Gbps')
				]]
			},
			{ id: 'wireless', label: 'Wireless', kind: 'wireless', rows: [[port('wifi1', 'wireless', '5 GHz', '5G'), port('wifi2', 'wireless', '2.4 GHz', '2G')]] }
		]
	},
	{
		model: 'CHR',
		aliases: ['CHR'],
		groups: [{ id: 'virtual', label: 'Virtual Ethernet', kind: 'virtual', rows: [range('ether', 1, 4, 'virtual', 'Virtual')] }]
	}
];

function catalogMatchNames(model: string | undefined) {
	const normalizedModel = normalizeIdentifier(model);
	const product = products.find(
		(candidate) =>
			normalizeIdentifier(candidate.product_code) === normalizedModel ||
			normalizeIdentifier(candidate.name) === normalizedModel
	);

	return new Set([normalizedModel, normalizeIdentifier(product?.product_code), normalizeIdentifier(product?.name)].filter(Boolean));
}

export function findPortLayout(model: string | undefined): PortLayoutEntry | undefined {
	const candidates = catalogMatchNames(model);

	return portLayoutCatalog.find((layout) =>
		[layout.model, ...layout.aliases].some((alias) => candidates.has(normalizeIdentifier(alias)))
	);
}

function naturalCompare(left: string, right: string) {
	return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function interfaceState(networkInterface: DevicePortInterface | undefined): DevicePortState {
	if (!networkInterface) return 'uncollected';
	if (networkInterface.disabled) return 'disabled';
	if (networkInterface.running) return 'active';
	return 'inactive';
}

function matchInterfaceByName(interfaces: DevicePortInterface[]) {
	return new Map(interfaces.map((networkInterface) => [normalizeIdentifier(networkInterface.name), networkInterface]));
}

function resolveKnownLayout(layout: PortLayoutEntry, interfaces: DevicePortInterface[]): ResolvedDevicePortLayout {
	const byName = matchInterfaceByName(interfaces);

	return {
		source: 'model',
		model: layout.model,
		groups: layout.groups.map((group) => ({
			...group,
			rows: group.rows.map((row) =>
				row.map((definition) => {
					const networkInterface = byName.get(normalizeIdentifier(definition.name));

					return {
						...definition,
						kind: definition.kind ?? group.kind ?? 'unknown',
						speed: definition.speed ?? group.speed,
						key: `${group.id}:${definition.name}`,
						state: interfaceState(networkInterface),
						interface: networkInterface
					};
				})
			)
		}))
	};
}

function resolveFallbackLayout(interfaces: DevicePortInterface[]): ResolvedDevicePortLayout {
	const sorted = [...interfaces].sort((left, right) => naturalCompare(left.name, right.name));

	return {
		source: 'fallback',
		groups: sorted.length
			? [
					{
						id: 'interfaces',
						label: 'Interfaces',
						kind: 'unknown',
						rows: [
							sorted.map((networkInterface) => ({
								name: networkInterface.name,
								label: networkInterface.name,
								kind: networkInterface.type?.includes('sfp') ? 'sfp' : 'unknown',
								key: `interfaces:${networkInterface.name}`,
								state: interfaceState(networkInterface),
								interface: networkInterface
							}))
						]
					}
				]
			: []
	};
}

export function resolveDevicePortLayout(
	model: string | undefined,
	interfaces: DevicePortInterface[]
): ResolvedDevicePortLayout {
	const layout = findPortLayout(model);

	if (layout) {
		return resolveKnownLayout(layout, interfaces);
	}

	return resolveFallbackLayout(interfaces);
}
