import { getSqlite } from '$lib/server/db';
import { apiJson } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	getSqlite().prepare('select 1 as ok').get();
	return apiJson({ ok: true });
};
