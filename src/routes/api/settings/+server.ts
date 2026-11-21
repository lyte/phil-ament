import { SESSION_COOKIE, sessionCookieOptions } from '$lib/server/auth';
import { apiError, apiJson, readJson } from '$lib/server/http';
import { getPublicSettings, updateSettings } from '$lib/server/settings';
import { APP_VERSION } from '$lib/version';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return apiJson({ ...getPublicSettings(), version: APP_VERSION });
};

export const PATCH: RequestHandler = async ({ request, cookies, url }) => {
	try {
		const body = await readJson(request);
		const result = updateSettings(body);
		if (result.sessionToken) {
			cookies.set(SESSION_COOKIE, result.sessionToken, sessionCookieOptions(url));
		}
		if (result.clearSession) {
			cookies.delete(SESSION_COOKIE, { path: '/' });
		}
		return apiJson(result.settings);
	} catch (error) {
		return apiError(error);
	}
};
