import { exportInventory } from '$lib/server/export-data';
import { apiError } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	try {
		const format = url.searchParams.get('format') ?? 'json';
		const file = exportInventory(format);
		return new Response(file.body, {
			headers: {
				'content-type': file.contentType,
				'content-disposition': `attachment; filename="${file.filename}"`,
				'cache-control': 'no-store'
			}
		});
	} catch (error) {
		return apiError(error);
	}
};
