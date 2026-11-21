import { compareBrands } from '$lib/brands';
import { compareMaterials, isBasicFamily } from '$lib/materials';
import type { Brand, Color, Material, MaterialFamily } from '$lib/types';
import { getDb, getSqlite } from './db';

export type Catalog = {
	brands: Brand[];
	materials: Material[];
	colors: Color[];
};

type Cache = { path: string; catalog: Catalog };

let cache: Cache | null = null;

function readCatalog(): Catalog {
	const sqlite = getSqlite();
	const brands = (
		sqlite
			.prepare(
				'select id, name, website, is_custom as isCustom from brands'
			)
			.all() as { id: number; name: string; website: string | null; isCustom: number }[]
	)
		.map((row) => ({ ...row, isCustom: row.isCustom === 1 }))
		.sort((a, b) => compareBrands(a.name, b.name));

	const materials = (
		sqlite
			.prepare('select id, name, family, is_custom as isCustom from materials')
			.all() as { id: number; name: string; family: MaterialFamily; isCustom: number }[]
	)
		.map((row) => ({
			id: row.id,
			name: row.name,
			family: row.family,
			basic: isBasicFamily(row.family),
			isCustom: row.isCustom === 1
		}))
		.sort(compareMaterials);

	const colors = sqlite
		.prepare(
			`select id, name, hex, brand_id as brandId, material_id as materialId,
				extruder_temp as extruderTemp, extruder_temp_min as extruderTempMin,
				extruder_temp_max as extruderTempMax
			 from colors
			 order by name collate nocase`
		)
		.all() as Color[];

	return { brands, materials, colors };
}

export function getCatalog(): Catalog {
	const { path } = getDb();
	if (cache?.path === path) return cache.catalog;
	const catalog = readCatalog();
	cache = { path, catalog };
	return catalog;
}

export function colorsFor(brandId: number, materialId?: number) {
	return getCatalog().colors.filter((color) => {
		if (color.brandId !== brandId) return false;
		if (materialId == null) return true;
		return color.materialId == null || color.materialId === materialId;
	});
}

export function materialsForBrand(brandId: number, mode: 'basic' | 'full') {
	const catalog = getCatalog();
	const colors = catalog.colors.filter((color) => color.brandId === brandId);
	const universal = colors.some((color) => color.materialId == null);
	const allowed = catalog.materials.filter((material) => mode === 'full' || material.basic);
	if (universal) return allowed;
	const ids = new Set(colors.map((color) => color.materialId));
	return allowed.filter((material) => ids.has(material.id));
}
