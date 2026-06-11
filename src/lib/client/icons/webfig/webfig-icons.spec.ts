import { describe, expect, it } from 'vitest';
import { webfigIconNames, webfigIcons } from './webfig-icons';

describe('WebFig icon registry', () => {
	it('contains the extracted WebFig SVG icon payloads', () => {
		expect(webfigIconNames).toHaveLength(113);
		expect(webfigIcons.Bridge).toContain('<svg');
		expect(webfigIcons.Wifi).toContain('viewBox');
		expect(webfigIcons.Close_12x12).toContain('12 12');
	});

	it('maps WebFig brand colors to theme variables', () => {
		expect(webfigIcons.Bridge).toContain('var(--webfig-icon-primary, var(--icon-color))');
		expect(webfigIcons.Bridge).toContain('var(--webfig-icon-accent, var(--icon-accent))');
		expect(webfigIcons.Bridge).not.toContain('#145656');
		expect(webfigIcons.Bridge).not.toContain('#3ca384');
	});

	it('preserves explicit semantic source colors', () => {
		expect(webfigIcons['Close_12x12-rev']).toContain('#ffffff');
		expect(webfigIcons['Close_12x12-red']).toContain('#a51c23');
	});
});
