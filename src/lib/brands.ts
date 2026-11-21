const TOP = ['bambu lab', 'sunlu', 'esun', 'ziro', 'overture', 'creality'];

/** Lower rank sorts first. Generic sits after the pinned brands and before everyone else. */
export function brandRank(name: string) {
	const normalized = name.toLowerCase();
	if (normalized === 'generic') return TOP.length;
	const index = TOP.findIndex(
		(token) => normalized === token || normalized.startsWith(`${token} `)
	);
	if (index >= 0) return index;
	return TOP.length + 1;
}

export function compareBrands(a: string, b: string) {
	const byRank = brandRank(a) - brandRank(b);
	if (byRank !== 0) return byRank;
	return a.localeCompare(b, undefined, { sensitivity: 'base' });
}
