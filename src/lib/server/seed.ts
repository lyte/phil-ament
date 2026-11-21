import type Database from 'better-sqlite3';
import catalog from './catalog/catalog-data.json';
import { familyOf } from '$lib/materials';

type CatalogColor = {
	b: string;
	m: string;
	n: string;
	h: string;
	t?: number;
	tmin?: number;
	tmax?: number;
};

type CatalogFile = {
	brands: string[];
	materials: string[];
	colors: CatalogColor[];
};

const data = catalog as CatalogFile;

const GENERIC_COLORS: [string, string][] = [
	['White', '#F4F4F4'],
	['Black', '#1A1A1A'],
	['Grey', '#8E8E8E'],
	['Red', '#D32F2F'],
	['Orange', '#EF6C00'],
	['Yellow', '#F9A825'],
	['Green', '#2E7D32'],
	['Blue', '#1565C0'],
	['Purple', '#6A1B9A'],
	['Brown', '#6D4C41'],
	['Clear', '#E7F4F8'],
	['Pink', '#EC407A'],
	['Gold', '#C6A15B'],
	['Silver', '#C0C4C8'],
	['Natural', '#E6D3B1']
];

export function seedIfEmpty(sqlite: Database.Database) {
	const existing = sqlite.prepare('select count(*) as n from brands').get() as { n: number };
	if (existing.n > 0) return;

	const insertBrand = sqlite.prepare(
		'insert into brands (name, website, is_custom) values (?, null, 0)'
	);
	const insertMaterial = sqlite.prepare(
		'insert into materials (name, family, is_custom) values (?, ?, 0)'
	);
	const insertColor = sqlite.prepare(
		`insert into colors
			(name, hex, brand_id, material_id, extruder_temp, extruder_temp_min, extruder_temp_max, is_custom)
		 values (?, ?, ?, ?, ?, ?, ?, 0)`
	);

	const seed = sqlite.transaction(() => {
		const brandIds = new Map<string, number>();
		for (const name of data.brands) {
			const result = insertBrand.run(name);
			brandIds.set(name, Number(result.lastInsertRowid));
		}
		const generic = insertBrand.run('Generic');
		brandIds.set('Generic', Number(generic.lastInsertRowid));

		const materialIds = new Map<string, number>();
		for (const name of data.materials) {
			const result = insertMaterial.run(name, familyOf(name));
			materialIds.set(name, Number(result.lastInsertRowid));
		}

		for (const color of data.colors) {
			const brandId = brandIds.get(color.b);
			const materialId = materialIds.get(color.m);
			if (!brandId || !materialId) {
				throw new Error(`Catalog row is missing brand or material: ${color.b} / ${color.m}`);
			}
			insertColor.run(
				color.n,
				color.h,
				brandId,
				materialId,
				color.t ?? null,
				color.tmin ?? null,
				color.tmax ?? null
			);
		}

		const genericId = brandIds.get('Generic');
		for (const [name, hex] of GENERIC_COLORS) {
			insertColor.run(name, hex, genericId, null, null, null, null);
		}
	});

	seed();
	if (process.env.NODE_ENV !== 'test') {
		console.log(
			`[phil-ament] seeded ${data.colors.length} SpoolmanDB colors plus Generic`
		);
	}
}

const DEFAULTS: [string, string][] = [
	['appearance', 'system'],
	['materials_mode', 'basic'],
	['auth_enabled', '0'],
	['password_hash', '']
];

export function ensureSettings(sqlite: Database.Database) {
	const insert = sqlite.prepare('insert or ignore into settings (key, value) values (?, ?)');
	const tx = sqlite.transaction(() => {
		for (const [key, value] of DEFAULTS) insert.run(key, value);
	});
	tx();
}

export function maybeResetAuth(sqlite: Database.Database) {
	if (process.env.PHILAMENT_RESET_AUTH !== '1') return;
	sqlite.prepare(`update settings set value = '0' where key = 'auth_enabled'`).run();
	sqlite.prepare(`update settings set value = '' where key = 'password_hash'`).run();
	sqlite.prepare('delete from sessions').run();
	if (process.env.NODE_ENV !== 'test') {
		console.warn('[phil-ament] login was reset because PHILAMENT_RESET_AUTH=1');
	}
}
