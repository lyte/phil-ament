import { colorsFor, getCatalog, materialsForBrand } from '$lib/server/catalog';
import { getPublicSettings } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const settings = getPublicSettings();
	const catalog = getCatalog();
	const brand = catalog.brands[0];
	const materials = brand ? materialsForBrand(brand.id, settings.materialsMode) : [];
	const material = materials[0];
	const colors = brand && material ? colorsFor(brand.id, material.id) : [];
	return {
		brands: catalog.brands,
		materials,
		colors,
		brandId: brand?.id ?? null,
		materialId: material?.id ?? null
	};
};
