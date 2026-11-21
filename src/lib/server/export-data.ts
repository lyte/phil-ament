import { hotEndLabel } from '$lib/format';
import { listInventory } from './inventory';
import { HttpError } from './http';

function csvEscape(value: unknown) {
	const text = value == null ? '' : String(value);
	if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
	return text;
}

function rows() {
	return listInventory().map((item) => ({
		brand: item.brandName,
		material: item.materialName,
		color: item.colorName,
		hex: item.hex,
		roll_weight_g: item.rollWeightG,
		roll_count: item.rollCount,
		notes: item.notes,
		hotend: hotEndLabel(item) ?? '',
		updated_at: new Date(item.updatedAt).toISOString()
	}));
}

export function exportInventory(format: string) {
	const data = rows();
	if (format === 'json') {
		return {
			contentType: 'application/json; charset=utf-8',
			filename: 'phil-ament-inventory.json',
			body: JSON.stringify(data, null, 2)
		};
	}
	if (format === 'csv') {
		const header = [
			'brand',
			'material',
			'color',
			'hex',
			'roll_weight_g',
			'roll_count',
			'notes',
			'hotend',
			'updated_at'
		];
		const lines = data.map((row) => header.map((key) => csvEscape(row[key as keyof typeof row])).join(','));
		return {
			contentType: 'text/csv; charset=utf-8',
			filename: 'phil-ament-inventory.csv',
			body: `\uFEFF${header.join(',')}\n${lines.join('\n')}\n`
		};
	}
	throw new HttpError(400, 'Format must be csv or json');
}
