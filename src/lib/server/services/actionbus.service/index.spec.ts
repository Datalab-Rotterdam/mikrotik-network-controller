import { describe, expect, it, vi } from 'vitest';
import { isSiteActionChannel, siteChannel } from './index';

vi.mock('@sourceregistry/sveltekit-actionbus/server', () => ({
	createActionBus: vi.fn(() => ({
		broadcast: vi.fn(),
		destroy: vi.fn()
	}))
}));

describe('actionbus service helpers', () => {
	describe('siteChannel', () => {
		it('builds site channel string from site id', () => {
			expect(siteChannel('site-1')).toBe('site:site-1');
		});
	});

	describe('isSiteActionChannel', () => {
		it('accepts valid site channel strings', () => {
			expect(isSiteActionChannel('site:abc')).toBe(true);
			expect(isSiteActionChannel('site:some-long-id-123')).toBe(true);
		});

		it('rejects bare prefix with no id', () => {
			expect(isSiteActionChannel('site:')).toBe(false);
		});

		it('rejects non-site channels', () => {
			expect(isSiteActionChannel('discovery')).toBe(false);
			expect(isSiteActionChannel('other:abc')).toBe(false);
			expect(isSiteActionChannel('')).toBe(false);
		});
	});
});
