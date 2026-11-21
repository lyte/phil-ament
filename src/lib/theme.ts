import type { Appearance } from './types';

export const THEME_STORAGE_KEY = 'philament-theme';

export function systemIsDark() {
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyAppearance(appearance: Appearance) {
	const dark = appearance === 'dark' || (appearance === 'system' && systemIsDark());
	document.documentElement.classList.toggle('dark', dark);
	document.documentElement.dataset.theme = appearance;
	document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	const themeColor = document.querySelector('meta[name="theme-color"]');
	themeColor?.setAttribute('content', dark ? '#141311' : '#f4f1eb');
	localStorage.setItem(THEME_STORAGE_KEY, appearance);
}
