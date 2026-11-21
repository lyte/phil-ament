import { and, eq } from 'drizzle-orm';
import { ROLL_WEIGHT_G } from '$lib/format';
import type { InventoryItem, MaterialFamily } from '$lib/types';
import { getDb, getSqlite } from './db';
import { colors, inventoryItems } from './schema';
import { asInteger, asOptionalBoolean, asOptionalString, HttpError } from './http';

type Row = {
	id: number;
	brandId: number;
	materialId: number;
	colorId: number;
	brandName: string;
	materialName: string;
	materialFamily: MaterialFamily;
	colorName: string;
	hex: string;
	rollWeightG: number;
	rollCount: number;
	lowStockTracking: number | boolean;
	notes: string;
	extruderTemp: number | null;
	extruderTempMin: number | null;
	extruderTempMax: number | null;
	createdAt: number;
	updatedAt: number;
};

const SELECT = `
	select
		i.id as id,
		i.brand_id as brandId,
		i.material_id as materialId,
		i.color_id as colorId,
		b.name as brandName,
		m.name as materialName,
		m.family as materialFamily,
		c.name as colorName,
		c.hex as hex,
		i.roll_weight_g as rollWeightG,
		i.roll_count as rollCount,
		i.low_stock_tracking as lowStockTracking,
		i.notes as notes,
		c.extruder_temp as extruderTemp,
		c.extruder_temp_min as extruderTempMin,
		c.extruder_temp_max as extruderTempMax,
		i.created_at as createdAt,
		i.updated_at as updatedAt
	from inventory_items i
	join brands b on b.id = i.brand_id
	join materials m on m.id = i.material_id
	join colors c on c.id = i.color_id
`;

function asItem(row: Row): InventoryItem {
	return {
		...row,
		lowStockTracking: row.lowStockTracking === true || row.lowStockTracking === 1
	};
}

function escapeLike(value: string) {
	return value.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function listInventory(options: { q?: string; material?: string } = {}) {
	const sqlite = getSqlite();
	const where: string[] = [];
	const params: string[] = [];
	const query = options.q?.trim() ?? '';
	if (query) {
		const pattern = `%${escapeLike(query)}%`;
		where.push(
			`(lower(b.name) like ? escape '\\' or lower(m.name) like ? escape '\\' or lower(c.name) like ? escape '\\')`
		);
		params.push(pattern, pattern, pattern);
	}
	const material = options.material?.trim() ?? '';
	if (material && material !== 'all') {
		where.push(`(m.family = ? or lower(m.name) = ?)`);
		params.push(material.toLowerCase(), material.toLowerCase());
	}
	const sql = `${SELECT}${where.length ? ` where ${where.join(' and ')}` : ''}`;
	return (sqlite.prepare(sql).all(...params) as Row[]).map(asItem);
}

export function getInventoryItem(id: number) {
	const sqlite = getSqlite();
	const row = sqlite.prepare(`${SELECT} where i.id = ?`).get(id) as Row | undefined;
	return row ? asItem(row) : null;
}

function assertColorMatch(brandId: number, materialId: number, colorId: number) {
	const { db } = getDb();
	const color = db.select().from(colors).where(eq(colors.id, colorId)).get();
	if (!color || color.brandId !== brandId) {
		throw new HttpError(400, 'That color is not part of this brand');
	}
	if (color.materialId != null && color.materialId !== materialId) {
		throw new HttpError(400, 'That color is not part of this material');
	}
	const material = getSqlite().prepare('select id from materials where id = ?').get(materialId);
	if (!material) throw new HttpError(400, 'Unknown material');
	const brand = getSqlite().prepare('select id from brands where id = ?').get(brandId);
	if (!brand) throw new HttpError(400, 'Unknown brand');
}

export function addInventory(input: Record<string, unknown>) {
	const brandId = asInteger(input.brandId, 'Brand');
	const materialId = asInteger(input.materialId, 'Material');
	const colorId = asInteger(input.colorId, 'Color');
	const rollCount = asInteger(input.rollCount, 'Count');
	const notes = asOptionalString(input.notes, 'Notes') ?? '';
	const lowStockTracking = asOptionalBoolean(input.lowStockTracking, 'Low inventory tracking') ?? false;
	if (rollCount < 1 || rollCount > 999) {
		throw new HttpError(400, 'Count must be between 1 and 999');
	}
	assertColorMatch(brandId, materialId, colorId);

	const { db } = getDb();
	const now = Date.now();
	let merged = false;
	const id = db.transaction((tx) => {
		const existing = tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.brandId, brandId),
					eq(inventoryItems.materialId, materialId),
					eq(inventoryItems.colorId, colorId),
					eq(inventoryItems.rollWeightG, ROLL_WEIGHT_G)
				)
			)
			.get();
		if (existing) {
			merged = true;
			const next = Math.min(999, existing.rollCount + rollCount);
			tx.update(inventoryItems)
				.set({
					rollCount: next,
					updatedAt: now,
					// Adding rolls with tracking off should not clear a flag already set on the item.
					...(lowStockTracking ? { lowStockTracking: true } : {})
				})
				.where(eq(inventoryItems.id, existing.id))
				.run();
			return existing.id;
		}
		const inserted = tx
			.insert(inventoryItems)
			.values({
				brandId,
				materialId,
				colorId,
				rollWeightG: ROLL_WEIGHT_G,
				rollCount,
				lowStockTracking,
				notes,
				createdAt: now,
				updatedAt: now
			})
			.returning({ id: inventoryItems.id })
			.get();
		if (!inserted) throw new HttpError(500, 'Could not add that filament');
		return inserted.id;
	});

	const item = getInventoryItem(id);
	if (!item) throw new HttpError(500, 'Could not read the new filament');
	return { item, merged };
}

export function updateInventory(id: number, input: Record<string, unknown>) {
	const current = getInventoryItem(id);
	if (!current) throw new HttpError(404, 'That filament is not in your inventory');
	const patch: { rollCount?: number; notes?: string; lowStockTracking?: boolean; updatedAt: number } = {
		updatedAt: Date.now()
	};
	if (input.rollCount !== undefined) {
		const rollCount = asInteger(input.rollCount, 'Count');
		if (rollCount < 0 || rollCount > 999) throw new HttpError(400, 'Count must be between 0 and 999');
		patch.rollCount = rollCount;
	}
	if (input.notes !== undefined) {
		patch.notes = asOptionalString(input.notes, 'Notes') ?? '';
	}
	if (input.lowStockTracking !== undefined) {
		const tracking = asOptionalBoolean(input.lowStockTracking, 'Low inventory tracking');
		if (tracking === undefined) throw new HttpError(400, 'Low inventory tracking must be true or false');
		patch.lowStockTracking = tracking;
	}
	if (patch.rollCount === undefined && patch.notes === undefined && patch.lowStockTracking === undefined) {
		throw new HttpError(400, 'Nothing to update');
	}
	const { db } = getDb();
	db.update(inventoryItems).set(patch).where(eq(inventoryItems.id, id)).run();
	const item = getInventoryItem(id);
	if (!item) throw new HttpError(500, 'Could not read that filament');
	return item;
}

export function deleteInventory(id: number) {
	const item = getInventoryItem(id);
	if (!item) throw new HttpError(404, 'That filament is not in your inventory');
	const { db } = getDb();
	db.delete(inventoryItems).where(eq(inventoryItems.id, id)).run();
	return item;
}
