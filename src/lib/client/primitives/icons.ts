import { webfigIcons, type WebFigIconName } from '$lib/client/icons/webfig/webfig-icons';

export const ICON_ALIASES = {
	dashboard: 'Quick_Set',
	topology: 'Mesh',
	monitor: 'Dude',
	person: 'User_Manager',
	shield: 'Safe_Mode',
	ports: 'Ports_12x12',
	bell: 'Info_12x12',
	document: 'Files',
	jobs: 'Log',
	log: 'Log',
	gear: 'Configuration',
	'user-plus': 'User_Manager',
	'bar-chart': 'Graph',
	activity: 'Netwatch_12x12',
	lines: 'Load_12x12',
	backup: 'Supout',
	'chevron-down': 'ChevronSmall_12x12',
	check: 'Check_12x12-green',
	plus: 'Plus_12x12',
	logout: 'Exit',
	'arrow-left': 'Return_12x12',
	close: 'Close',
	'external-link': 'OpenFlow',
	terminal: 'Terminal',
	'device-screen': 'VirtualMachine',
	crosshair: 'Find'
} as const satisfies Record<string, WebFigIconName>;

export type IconAliasName = keyof typeof ICON_ALIASES;
export type IconName = WebFigIconName | IconAliasName;

export const iconNames = [
	...Object.keys(webfigIcons),
	...Object.keys(ICON_ALIASES)
] as IconName[];

export function resolveIconName(name: IconName): WebFigIconName {
	if (name in webfigIcons) {
		return name as WebFigIconName;
	}

	return ICON_ALIASES[name as IconAliasName];
}

