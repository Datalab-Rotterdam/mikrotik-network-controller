import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { actionbus } from '@sourceregistry/sveltekit-actionbus/vite';

export default defineConfig({
	plugins: [sveltekit(), actionbus()],
	server: {
		hmr: {
			port: 5174
		}
	}
});
