import { deleteInventory, updateInventory } from '$lib/server/inventory';
import { apiError, apiJson, HttpError, readJson } from '$lib/server/http';
import type { RequestHandler } from './$types';

function idFrom(params: { id: string }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) throw new HttpError(404, 'That filament is not in your inventory');
	return id;
}

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await readJson(request);
		return apiJson({ item: updateInventory(idFrom(params), body) });
	} catch (error) {
		return apiError(error);
	}
};

export const DELETE: RequestHandler = ({ params }) => {
	try {
		return apiJson({ item: deleteInventory(idFrom(params)) });
	} catch (error) {
		return apiError(error);
	}
};
