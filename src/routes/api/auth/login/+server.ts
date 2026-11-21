import { login, SESSION_COOKIE, sessionCookieOptions } from '$lib/server/auth';
import { apiError, apiJson, readJson } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	try {
		const body = await readJson(request);
		const password = typeof body.password === 'string' ? body.password : '';
		const token = login(password);
		cookies.set(SESSION_COOKIE, token, sessionCookieOptions(url));
		return apiJson({ ok: true });
	} catch (error) {
		return apiError(error);
	}
};
