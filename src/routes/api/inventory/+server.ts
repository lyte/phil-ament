import { addInventory, listInventory } from '$lib/server/inventory';
import { apiError, apiJson, readJson } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	try {
		const items = listInventory({
			q: url.searchParams.get('q') ?? undefined,
			material: url.searchParams.get('material') ?? undefined
		});
		const rolls = items.reduce((sum, item) => sum + item.rollCount, 0);
		return apiJson({ items, summary: { rolls, items: items.length } });
	} catch (error) {
		return apiError(error);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await readJson(request);
		return apiJson(addInventory(body), 201);
	} catch (error) {
		return apiError(error);
	}
};
