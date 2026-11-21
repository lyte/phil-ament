import { writable } from 'svelte/store';

export type UndoPayload = {
	brandId: number;
	materialId: number;
	colorId: number;
	rollCount: number;
	notes: string;
};

export const undoStore = writable<UndoPayload | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;

export function offerUndo(payload: UndoPayload) {
	if (timer) clearTimeout(timer);
	undoStore.set(payload);
	timer = setTimeout(() => undoStore.set(null), 6000);
}

export function clearUndo() {
	if (timer) clearTimeout(timer);
	undoStore.set(null);
}
