import type { InventoryItem } from './types';

export const ROLL_WEIGHT_G = 1000;

export function summaryLine(rolls: number, items: number) {
	const rollWord = rolls === 1 ? 'roll' : 'rolls';
	const itemWord = items === 1 ? 'item' : 'items';
	return `${rolls} ${rollWord} across ${items} ${itemWord}`;
}

export function weightLabel(grams: number) {
	if (grams > 0 && grams % 1000 === 0) return `${grams / 1000} kg`;
	return `${grams} g`;
}

export function hotEndLabel(
	item: Pick<InventoryItem, 'extruderTemp' | 'extruderTempMin' | 'extruderTempMax'>
) {
	if (item.extruderTempMin != null && item.extruderTempMax != null) {
		if (item.extruderTempMin === item.extruderTempMax) return `${item.extruderTempMin}°C`;
		return `${item.extruderTempMin}–${item.extruderTempMax}°C`;
	}
	if (item.extruderTemp != null) return `${item.extruderTemp}°C`;
	return null;
}

export function isLow(item: { rollCount: number; lowStockTracking: boolean }) {
	return item.lowStockTracking && item.rollCount <= 1;
}

/** One hex or a comma-separated list becomes a CSS background. */
export function swatchBackground(hex: string) {
	const parts = hex
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length <= 1) return parts[0] ?? '#888888';
	const step = 100 / parts.length;
	const stops = parts
		.map((color, index) => `${color} ${index * step}% ${(index + 1) * step}%`)
		.join(', ');
	return `linear-gradient(135deg, ${stops})`;
}
