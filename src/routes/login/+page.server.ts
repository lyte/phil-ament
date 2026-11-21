import { fail, redirect } from '@sveltejs/kit';
import { login, SESSION_COOKIE, sessionCookieOptions } from '$lib/server/auth';
import { HttpError } from '$lib/server/http';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		try {
			const token = login(password);
			cookies.set(SESSION_COOKIE, token, sessionCookieOptions(url));
		} catch (error) {
			const message = error instanceof HttpError ? error.message : 'Could not sign in';
			return fail(400, { error: message });
		}
		throw redirect(303, '/');
	}
};
