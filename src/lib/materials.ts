import type { Material, MaterialFamily } from './types';

const ORDER: Record<MaterialFamily, number> = {
	pla: 0,
	petg: 1,
	tpu: 2,
	abs: 3,
	other: 4
};

export function familyOf(name: string): MaterialFamily {
	const normalized = name.toUpperCase().replace(/[^A-Z0-9+]/g, '');
	if (normalized.startsWith('PLA')) return 'pla';
	if (normalized.startsWith('PETG')) return 'petg';
	if (normalized.startsWith('TPU')) return 'tpu';
	if (normalized.startsWith('ABS')) return 'abs';
	return 'other';
}

export function isBasicFamily(family: string) {
	return family === 'pla' || family === 'petg' || family === 'tpu' || family === 'abs';
}

export function compareMaterials(a: Pick<Material, 'name' | 'family'>, b: Pick<Material, 'name' | 'family'>) {
	const byFamily = (ORDER[a.family] ?? 9) - (ORDER[b.family] ?? 9);
	if (byFamily !== 0) return byFamily;
	const rank = (material: Pick<Material, 'name' | 'family'>) => {
		const base = material.family.toUpperCase();
		const name = material.name.toUpperCase();
		if (name === base) return 0;
		if (name === `${base}+`) return 1;
		return 2;
	};
	const byRank = rank(a) - rank(b);
	if (byRank !== 0) return byRank;
	return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}
