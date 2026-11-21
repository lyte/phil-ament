import type { InventoryItem } from './types';

export type Chip = { id: string; label: string };

const FAMILY_CHIPS: Chip[] = [
	{ id: 'pla', label: 'PLA' },
	{ id: 'petg', label: 'PETG' },
	{ id: 'tpu', label: 'TPU' },
	{ id: 'abs', label: 'ABS' }
];

export function materialChips(
	items: Pick<InventoryItem, 'materialName' | 'materialFamily'>[]
): Chip[] {
	const chips: Chip[] = [{ id: 'all', label: 'All' }];
	for (const family of FAMILY_CHIPS) {
		if (items.some((item) => item.materialFamily === family.id)) chips.push(family);
	}
	const others = new Set<string>();
	for (const item of items) {
		if (item.materialFamily === 'other') others.add(item.materialName);
	}
	for (const name of [...others].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))) {
		chips.push({ id: `name:${name}`, label: name });
	}
	return chips;
}

export function matchesChip(item: Pick<InventoryItem, 'materialName' | 'materialFamily'>, chipId: string) {
	if (!chipId || chipId === 'all') return true;
	if (chipId.startsWith('name:')) return item.materialName === chipId.slice(5);
	return item.materialFamily === chipId;
}

export function matchesSearch(
	item: Pick<InventoryItem, 'brandName' | 'materialName' | 'colorName'>,
	query: string
) {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return [item.brandName, item.materialName, item.colorName].some((value) =>
		value.toLowerCase().includes(needle)
	);
}
