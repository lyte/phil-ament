import { getPublicSettings } from '$lib/server/settings';
import { APP_VERSION } from '$lib/version';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	return { ...getPublicSettings(), version: APP_VERSION };
};
