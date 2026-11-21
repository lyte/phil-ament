import { listInventory } from '$lib/server/inventory';
import { compareBrands } from '$lib/brands';
import { compareMaterials } from '$lib/materials';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const items = listInventory().sort((a, b) => {
		return (
			compareBrands(a.brandName, b.brandName) ||
			compareMaterials(
				{ name: a.materialName, family: a.materialFamily },
				{ name: b.materialName, family: b.materialFamily }
			) ||
			a.colorName.localeCompare(b.colorName, undefined, { sensitivity: 'base' })
		);
	});
	return { items };
};
