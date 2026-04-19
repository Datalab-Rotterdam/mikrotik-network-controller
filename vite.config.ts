import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import {websockets} from "@sourceregistry/sveltekit-websockets/vite";

export default defineConfig({
	plugins: [sveltekit(), websockets()],
	server: {
		hmr: {
			port: 5174
		}
	}
});
