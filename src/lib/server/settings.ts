import type { Appearance, MaterialsMode, PublicSettings } from '$lib/types';
import { changePassword, disableAuth, enableAuth, isAuthEnabled } from './auth';
import { getSqlite } from './db';
import { HttpError } from './http';

function read(key: string) {
	const row = getSqlite().prepare('select value from settings where key = ?').get(key) as
		| { value: string }
		| undefined;
	return row?.value ?? '';
}

function write(key: string, value: string) {
	getSqlite().prepare('update settings set value = ? where key = ?').run(value, key);
}

export function getPublicSettings(): PublicSettings {
	const appearance = read('appearance');
	const materialsMode = read('materials_mode');
	return {
		appearance: appearance === 'light' || appearance === 'dark' ? appearance : 'system',
		materialsMode: materialsMode === 'full' ? 'full' : 'basic',
		authEnabled: isAuthEnabled()
	};
}

export function updateSettings(input: {
	appearance?: unknown;
	materialsMode?: unknown;
	authEnabled?: unknown;
	password?: unknown;
	currentPassword?: unknown;
	newPassword?: unknown;
}) {
	let sessionToken: string | undefined;
	let clearSession = false;

	if (input.appearance !== undefined) {
		if (input.appearance !== 'system' && input.appearance !== 'light' && input.appearance !== 'dark') {
			throw new HttpError(400, 'Appearance must be system, light, or dark');
		}
		const appearance: Appearance = input.appearance;
		write('appearance', appearance);
	}

	if (input.materialsMode !== undefined) {
		if (input.materialsMode !== 'basic' && input.materialsMode !== 'full') {
			throw new HttpError(400, 'Materials must be basic or full');
		}
		const materialsMode: MaterialsMode = input.materialsMode;
		write('materials_mode', materialsMode);
	}

	if (input.newPassword !== undefined) {
		if (typeof input.currentPassword !== 'string' || typeof input.newPassword !== 'string') {
			throw new HttpError(400, 'Enter the current password and a new one');
		}
		changePassword(input.currentPassword, input.newPassword);
	}

	if (input.authEnabled === true && !isAuthEnabled()) {
		if (typeof input.password !== 'string') {
			throw new HttpError(400, 'Set a password to turn login on');
		}
		sessionToken = enableAuth(input.password);
	} else if (input.authEnabled === false && isAuthEnabled()) {
		disableAuth();
		clearSession = true;
	}

	return { settings: getPublicSettings(), sessionToken, clearSession };
}
