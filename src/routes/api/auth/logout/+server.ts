import { revokeSession, SESSION_COOKIE } from '$lib/server/auth';
import { apiJson } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
	revokeSession(cookies.get(SESSION_COOKIE));
	cookies.delete(SESSION_COOKIE, { path: '/' });
	return apiJson({ ok: true });
};
