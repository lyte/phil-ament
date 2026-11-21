export type Appearance = 'system' | 'light' | 'dark';
export type MaterialsMode = 'basic' | 'full';
export type MaterialFamily = 'pla' | 'petg' | 'tpu' | 'abs' | 'other';

export type Brand = {
	id: number;
	name: string;
	website: string | null;
	isCustom: boolean;
};

export type Material = {
	id: number;
	name: string;
	family: MaterialFamily;
	basic: boolean;
	isCustom: boolean;
};

export type Color = {
	id: number;
	name: string;
	hex: string;
	brandId: number | null;
	materialId: number | null;
	extruderTemp: number | null;
	extruderTempMin: number | null;
	extruderTempMax: number | null;
};

export type InventoryItem = {
	id: number;
	brandId: number;
	materialId: number;
	colorId: number;
	brandName: string;
	materialName: string;
	materialFamily: MaterialFamily;
	colorName: string;
	hex: string;
	rollWeightG: number;
	rollCount: number;
	notes: string;
	extruderTemp: number | null;
	extruderTempMin: number | null;
	extruderTempMax: number | null;
	createdAt: number;
	updatedAt: number;
};

export type PublicSettings = {
	appearance: Appearance;
	materialsMode: MaterialsMode;
	authEnabled: boolean;
};
