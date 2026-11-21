import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Host is checked in hooks.server.ts. Trusting every origin here
		// turns off Kit's scheme-sensitive check, which rejects plain HTTP
		// because adapter-node assumes https without x-forwarded-proto.
		csrf: {
			trustedOrigins: ['*']
		}
	}
};

export default config;
