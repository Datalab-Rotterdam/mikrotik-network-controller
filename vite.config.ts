import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { actionbus } from '@sourceregistry/sveltekit-actionbus/vite';

export default defineConfig({
	plugins: [sveltekit(), actionbus()],
	server: {
		hmr: {
			port: 5174
		}
	},
	test: {
		exclude: ['**/node_modules/**', '**/.git/**', '**/.claude/**']
	}
});
