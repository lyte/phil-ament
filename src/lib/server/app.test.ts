import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, expect, it } from 'vitest';

const dir = mkdtempSync(path.join(tmpdir(), 'philament-'));
process.env.DATABASE_PATH = path.join(dir, 'phil-ament.db');
process.env.PHILAMENT_RESET_AUTH = '0';

import { disableAuth, enableAuth, isAuthEnabled, login, passwordMatches } from './auth';
import { colorsFor, getCatalog } from './catalog';
import { closeDb, getDb, getSqlite } from './db';
import { exportInventory } from './export-data';
import { HttpError } from './http';
import { addInventory, deleteInventory, listInventory, updateInventory } from './inventory';
import { hotEndLabel } from '$lib/format';

beforeAll(() => {
	getDb();
});

afterEach(() => {
	getSqlite().prepare('delete from inventory_items').run();
	if (isAuthEnabled()) disableAuth();
});

function bambuPla() {
	const catalog = getCatalog();
	const brand = catalog.brands.find((entry) => entry.name === 'Bambu Lab');
	const pla = catalog.materials.find((entry) => entry.name === 'PLA');
	const petg = catalog.materials.find((entry) => entry.name === 'PETG');
	if (!brand || !pla || !petg) throw new Error('expected Bambu Lab PLA and PETG');
	const plaColors = colorsFor(brand.id, pla.id).filter((color) => color.materialId === pla.id);
	const petgColors = colorsFor(brand.id, petg.id).filter((color) => color.materialId === petg.id);
	const color = plaColors.find((entry) => entry.extruderTemp != null || entry.extruderTempMin != null) ?? plaColors[0];
	const other = plaColors.find((entry) => entry.id !== color.id) ?? plaColors[0];
	return { brand, pla, petg, color, other, petgColor: petgColors[0] };
}

it('seeds SpoolmanDB brands in the picker order, plus Generic', () => {
	const names = getCatalog().brands.slice(0, 7).map((brand) => brand.name);
	expect(names).toEqual(['Bambu Lab', 'Sunlu', 'eSun', 'ZIRO 3D', 'Overture', 'Creality', 'Generic']);
	expect(getCatalog().colors.length).toBeGreaterThan(1000);
});

it('keeps basic materials to PLA, PETG, TPU, ABS and their variants', () => {
	const materials = getCatalog().materials;
	const basic = new Set(materials.filter((material) => material.basic).map((material) => material.name));
	for (const name of ['PLA', 'PLA+', 'PLA Silk', 'PLA Matte', 'PETG-CF', 'TPU 95A', 'ABS']) {
		expect(basic.has(name)).toBe(true);
	}
	expect(materials.find((material) => material.name === 'ASA')?.basic).toBe(false);
});

it('stores whole 1 kg rolls and adds to the count instead of duplicating', () => {
	const { brand, pla, color } = bambuPla();
	const first = addInventory({
		brandId: brand.id,
		materialId: pla.id,
		colorId: color.id,
		rollCount: 2,
		notes: 'shelf A'
	});
	expect(first.merged).toBe(false);
	expect(first.item.rollWeightG).toBe(1000);
	expect(hotEndLabel(first.item)).not.toBeNull();

	const second = addInventory({
		brandId: brand.id,
		materialId: pla.id,
		colorId: color.id,
		rollCount: 3
	});
	expect(second.merged).toBe(true);
	expect(second.item.id).toBe(first.item.id);
	expect(second.item.rollCount).toBe(5);
	expect(second.item.notes).toBe('shelf A');
	expect(first.item.lowStockTracking).toBe(false);
});

it('tracks low inventory per item and leaves it off unless asked', () => {
	const { brand, pla, color, other } = bambuPla();
	const plain = addInventory({
		brandId: brand.id,
		materialId: pla.id,
		colorId: color.id,
		rollCount: 1
	});
	expect(plain.item.lowStockTracking).toBe(false);
	const tracked = addInventory({
		brandId: brand.id,
		materialId: pla.id,
		colorId: other.id,
		rollCount: 1,
		lowStockTracking: true
	});
	expect(tracked.item.lowStockTracking).toBe(true);
	const stillTracked = addInventory({
		brandId: brand.id,
		materialId: pla.id,
		colorId: other.id,
		rollCount: 1,
		lowStockTracking: false
	});
	expect(stillTracked.merged).toBe(true);
	expect(stillTracked.item.lowStockTracking).toBe(true);
	const turnedOff = updateInventory(tracked.item.id, { lowStockTracking: false });
	expect(turnedOff.lowStockTracking).toBe(false);
	expect(() => updateInventory(tracked.item.id, { lowStockTracking: 'yes' })).toThrow(HttpError);
});

it('does not merge a different material, and rejects a mismatched color', () => {
	const { brand, pla, petg, color, petgColor } = bambuPla();
	expect(petgColor).toBeTruthy();
	addInventory({ brandId: brand.id, materialId: pla.id, colorId: color.id, rollCount: 1 });
	const other = addInventory({
		brandId: brand.id,
		materialId: petg.id,
		colorId: petgColor.id,
		rollCount: 1
	});
	expect(other.merged).toBe(false);
	expect(listInventory().length).toBe(2);
	expect(() =>
		addInventory({ brandId: brand.id, materialId: petg.id, colorId: color.id, rollCount: 1 })
	).toThrow(HttpError);
});

it('searches and filters inventory', () => {
	const { brand, pla, color } = bambuPla();
	addInventory({ brandId: brand.id, materialId: pla.id, colorId: color.id, rollCount: 1 });
	expect(listInventory({ q: 'bambu' })).toHaveLength(1);
	expect(listInventory({ q: color.name.slice(0, 4) }).length).toBeGreaterThan(0);
	expect(listInventory({ material: 'pla' })).toHaveLength(1);
	expect(listInventory({ material: 'petg' })).toHaveLength(0);
	expect(listInventory({ q: 'not-a-real-filament' })).toHaveLength(0);
});

it('updates count and notes, then deletes', () => {
	const { brand, pla, color } = bambuPla();
	const created = addInventory({
		brandId: brand.id,
		materialId: pla.id,
		colorId: color.id,
		rollCount: 4
	});
	const updated = updateInventory(created.item.id, { rollCount: 1, notes: 'last one' });
	expect(updated.rollCount).toBe(1);
	expect(updated.notes).toBe('last one');
	deleteInventory(created.item.id);
	expect(listInventory()).toHaveLength(0);
});

it('omits a hot end for Generic colors', () => {
	const catalog = getCatalog();
	const generic = catalog.brands.find((brand) => brand.name === 'Generic');
	const pla = catalog.materials.find((material) => material.name === 'PLA');
	if (!generic || !pla) throw new Error('missing generic or PLA');
	const black = colorsFor(generic.id, pla.id).find((color) => color.name === 'Black');
	expect(black?.extruderTemp).toBeNull();
	expect(black?.extruderTempMin).toBeNull();
	const added = addInventory({
		brandId: generic.id,
		materialId: pla.id,
		colorId: black!.id,
		rollCount: 1
	});
	expect(hotEndLabel(added.item)).toBeNull();
});

it('exports csv and json', () => {
	const { brand, pla, color } = bambuPla();
	addInventory({ brandId: brand.id, materialId: pla.id, colorId: color.id, rollCount: 2, notes: 'a, b' });
	const csv = exportInventory('csv');
	expect(csv.body.charCodeAt(0)).toBe(0xfeff);
	expect(csv.body).toContain('brand,material,color');
	expect(csv.body).toContain('Bambu Lab');
	expect(csv.body).toContain('"a, b"');
	expect(csv.body).toContain('low_stock_tracking');
	const json = JSON.parse(exportInventory('json').body) as { roll_count: number; low_stock_tracking: boolean }[];
	expect(json[0].roll_count).toBe(2);
	expect(json[0].low_stock_tracking).toBe(false);
	expect(() => exportInventory('xml')).toThrow(HttpError);
});

it('keeps login off until a password is set, and stores only a hash', () => {
	expect(isAuthEnabled()).toBe(false);
	expect(() => enableAuth('short')).toThrow(HttpError);
	enableAuth('password1');
	expect(isAuthEnabled()).toBe(true);
	const stored = (getSqlite().prepare(`select value from settings where key = 'password_hash'`).get() as { value: string }).value;
	expect(stored.startsWith('scrypt$')).toBe(true);
	expect(stored).not.toContain('password1');
	expect(passwordMatches('password1', stored)).toBe(true);
	expect(() => login('nope')).toThrow(HttpError);
	expect(login('password1')).toEqual(expect.any(String));
});

it('defaults rows that already existed to tracking off', () => {
	const file = path.join(dir, 'before-tracking.db');
	const sqlite = new Database(file);
	sqlite.pragma('foreign_keys = ON');
	for (const statement of readFileSync('drizzle/0000_init.sql', 'utf8').split('--> statement-breakpoint')) {
		const sql = statement.trim();
		if (sql) sqlite.exec(sql);
	}
	sqlite.prepare('insert into brands (name, is_custom) values (?, 0)').run('Test');
	sqlite.prepare('insert into materials (name, family, is_custom) values (?, ?, 0)').run('PLA', 'pla');
	sqlite.prepare('insert into colors (name, hex, brand_id, material_id, is_custom) values (?, ?, 1, 1, 0)').run('Black', '#000000');
	sqlite.prepare(
		'insert into inventory_items (brand_id, material_id, color_id, roll_count, created_at, updated_at) values (1, 1, 1, 1, 0, 0)'
	).run();
	sqlite.exec(readFileSync('drizzle/0001_low_stock_tracking.sql', 'utf8'));
	const row = sqlite.prepare('select low_stock_tracking as tracking from inventory_items').get() as { tracking: number };
	expect(row.tracking).toBe(0);
	sqlite.close();
});

it('resets login when PHILAMENT_RESET_AUTH=1', () => {
	enableAuth('password1');
	process.env.PHILAMENT_RESET_AUTH = '1';
	closeDb();
	getDb();
	expect(isAuthEnabled()).toBe(false);
	process.env.PHILAMENT_RESET_AUTH = '0';
	closeDb();
	getDb();
});
