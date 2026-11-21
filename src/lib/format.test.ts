import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareBrands } from './brands';
import { hotEndLabel, isLow, summaryLine, swatchBackground, weightLabel } from './format';
import { matchesChip, matchesSearch, materialChips } from './filters';
import { familyOf, isBasicFamily } from './materials';

describe('format', () => {
	it('summarizes rolls the way the home screen does', () => {
		expect(summaryLine(11, 5)).toBe('11 rolls across 5 items');
		expect(summaryLine(1, 1)).toBe('1 roll across 1 item');
	});

	it('shows a hot end only when a temperature is known', () => {
		expect(hotEndLabel({ extruderTemp: 220, extruderTempMin: null, extruderTempMax: null })).toBe('220°C');
		expect(hotEndLabel({ extruderTemp: null, extruderTempMin: 190, extruderTempMax: 230 })).toBe('190–230°C');
		expect(hotEndLabel({ extruderTemp: null, extruderTempMin: null, extruderTempMax: null })).toBeNull();
	});

	it('flags Low only when tracking is on and the count is 1 or fewer', () => {
		expect(isLow({ rollCount: 1, lowStockTracking: false })).toBe(false);
		expect(isLow({ rollCount: 0, lowStockTracking: false })).toBe(false);
		expect(isLow({ rollCount: 1, lowStockTracking: true })).toBe(true);
		expect(isLow({ rollCount: 0, lowStockTracking: true })).toBe(true);
		expect(isLow({ rollCount: 2, lowStockTracking: true })).toBe(false);
		expect(weightLabel(1000)).toBe('1 kg');
	});

	it('builds a gradient for multi-hex colors', () => {
		expect(swatchBackground('#112233,#AABBCC')).toContain('linear-gradient');
		expect(swatchBackground('#112233')).toBe('#112233');
	});
});

describe('catalog ordering', () => {
	it('pins the common brands, then Generic, then the rest', () => {
		const names = ['AzureFilm', 'Generic', 'ZIRO 3D', 'Creality', 'Bambu Lab', 'eSun', 'Overture', 'Sunlu', 'add:north'];
		expect([...names].sort(compareBrands)).toEqual([
			'Bambu Lab',
			'Sunlu',
			'eSun',
			'ZIRO 3D',
			'Overture',
			'Creality',
			'Generic',
			'add:north',
			'AzureFilm'
		]);
	});

	it('treats PLA, PETG, TPU, and ABS variants as basic', () => {
		for (const name of ['PLA', 'PLA+', 'PLA Silk', 'PLA Matte', 'PETG-CF', 'TPU 95A', 'ABS']) {
			expect(isBasicFamily(familyOf(name))).toBe(true);
		}
		expect(isBasicFamily(familyOf('ASA'))).toBe(false);
		expect(isBasicFamily(familyOf('PEEK'))).toBe(false);
	});
});

describe('inventory filters', () => {
	const items = [
		{ brandName: 'Bambu Lab', materialName: 'PLA Silk', materialFamily: 'pla' as const, colorName: 'Gold' },
		{ brandName: 'Sunlu', materialName: 'PETG', materialFamily: 'petg' as const, colorName: 'Black' },
		{ brandName: 'Polymaker', materialName: 'ASA', materialFamily: 'other' as const, colorName: 'White' }
	];

	it('offers family chips that are actually in the list', () => {
		expect(materialChips(items).map((chip) => chip.label)).toEqual(['All', 'PLA', 'PETG', 'ASA']);
	});

	it('matches a family chip and a search across brand, type, and color', () => {
		expect(matchesChip(items[0], 'pla')).toBe(true);
		expect(matchesChip(items[2], 'name:ASA')).toBe(true);
		expect(matchesSearch(items[0], 'gold')).toBe(true);
		expect(matchesSearch(items[1], 'petg')).toBe(true);
		expect(matchesSearch(items[1], 'bambu')).toBe(false);
	});
});

describe('credits', () => {
	it('keeps the SpoolmanDB permission notice beside the catalog', () => {
		const notice = readFileSync('src/lib/server/catalog/NOTICE', 'utf8');
		expect(notice).toContain('Copyright (c) 2024 Donkie');
		expect(notice).toContain('Permission is hereby granted');
		expect(notice).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
	});

	it('names the author as futuristicvlad', () => {
		const license = readFileSync('LICENSE', 'utf8');
		const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
		expect(license).toContain('Copyright (c) 2026 futuristicvlad');
		expect(pkg.author).toBe('futuristicvlad');
	});
});
