import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const brands = sqliteTable('brands', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	website: text('website'),
	isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false)
});

export const materials = sqliteTable('materials', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	family: text('family').notNull(),
	isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false)
});

export const colors = sqliteTable('colors', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	hex: text('hex').notNull(),
	brandId: integer('brand_id'),
	materialId: integer('material_id'),
	extruderTemp: integer('extruder_temp'),
	extruderTempMin: integer('extruder_temp_min'),
	extruderTempMax: integer('extruder_temp_max'),
	isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false)
});

export const inventoryItems = sqliteTable(
	'inventory_items',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		brandId: integer('brand_id').notNull(),
		materialId: integer('material_id').notNull(),
		colorId: integer('color_id').notNull(),
		rollWeightG: integer('roll_weight_g').notNull().default(1000),
		rollCount: integer('roll_count').notNull(),
		notes: text('notes').notNull().default(''),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull()
	},
	(table) => [uniqueIndex('inventory_combo_idx').on(table.brandId, table.materialId, table.colorId, table.rollWeightG)]
);

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export const sessions = sqliteTable('sessions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	tokenHash: text('token_hash').notNull().unique(),
	expiresAt: integer('expires_at').notNull()
});
