import { colorsFor, getCatalog } from '$lib/server/catalog';
import { apiError, apiJson } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	try {
		const catalog = getCatalog();
		const brandParam = url.searchParams.get('brandId');
		const materialParam = url.searchParams.get('materialId');
		const brandId = brandParam ? Number(brandParam) : undefined;
		const materialId = materialParam ? Number(materialParam) : undefined;
		const colors =
			brandId != null && Number.isInteger(brandId)
				? colorsFor(brandId, Number.isInteger(materialId) ? materialId : undefined)
				: catalog.colors;
		return apiJson({ brands: catalog.brands, materials: catalog.materials, colors });
	} catch (error) {
		return apiError(error);
	}
};
