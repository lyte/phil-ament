import { error } from '@sveltejs/kit';
import { getInventoryItem } from '$lib/server/inventory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const id = Number(params.id);
	const item = Number.isInteger(id) ? getInventoryItem(id) : null;
	if (!item) error(404, 'That filament is not in your inventory.');
	return { item };
};
