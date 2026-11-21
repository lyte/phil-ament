import { redirect, type Handle } from '@sveltejs/kit';
import { isAuthEnabled, SESSION_COOKIE, sessionIsValid } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { apiJson } from '$lib/server/http';

const PUBLIC_EXACT = new Set([
	'/login',
	'/api/health',
	'/api/auth/login',
	'/favicon.svg',
	'/manifest.webmanifest',
	'/sw.js',
	'/logo-dark-on-light.svg',
	'/logo-white-on-dark.svg',
	'/icon-black.svg',
	'/icon-white.svg'
]);

function isPublic(pathname: string) {
	if (PUBLIC_EXACT.has(pathname)) return true;
	if (pathname.startsWith('/_app/') || pathname.startsWith('/icons/')) return true;
	return /\.(svg|png|webp|ico|webmanifest|css|js|map|woff2?)$/.test(pathname);
}

function originAllowed(request: Request, url: URL) {
	if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return true;
	const origin = request.headers.get('origin');
	if (!origin) return true;
	try {
		// Same host is enough. The scheme on url may be https even when the
		// browser sent an http Origin, because the app is often reached
		// directly on a LAN without a proxy.
		return new URL(origin).host === url.host;
	} catch {
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	getDb();
	const authRequired = isAuthEnabled();
	const token = event.cookies.get(SESSION_COOKIE);
	const authenticated = authRequired && sessionIsValid(token);
	event.locals.authRequired = authRequired;
	event.locals.user = authenticated ? { authenticated: true } : null;

	if (!originAllowed(event.request, event.url)) {
		return apiJson({ error: 'Cross-origin request blocked' }, 403);
	}

	const { pathname } = event.url;
	if (authRequired && !event.locals.user && !isPublic(pathname)) {
		if (pathname.startsWith('/api/')) return apiJson({ error: 'Sign in required' }, 401);
		throw redirect(303, '/login');
	}

	if (pathname === '/login' && (!authRequired || event.locals.user)) {
		throw redirect(303, '/');
	}

	return resolve(event);
};
