<script lang="ts">
	import { goto } from '$app/navigation';
	import Stepper from '$lib/components/Stepper.svelte';
	import { swatchBackground } from '$lib/format';
	import type { Color, Material } from '$lib/types';

	let { data } = $props();
	let brandId = $state<number | null>(data.brandId);
	let materialId = $state<number | null>(data.materialId);
	let materials = $state<Material[]>(data.materials);
	let colors = $state<Color[]>(data.colors);
	let colorId = $state<number | null>(null);
	let rollCount = $state(1);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');

	$effect(() => {
		brandId = data.brandId;
		materialId = data.materialId;
		materials = data.materials;
		colors = data.colors;
	});

	async function loadBrand(nextBrand: number, preferredMaterial?: number | null) {
		loading = true;
		error = '';
		const response = await fetch(`/api/catalog?brandId=${nextBrand}`);
		loading = false;
		if (!response.ok) {
			error = 'Could not load colors.';
			return;
		}
		const body = await response.json();
		const mode = data.materialsMode;
		const brandColors = body.colors as Color[];
		const universal = brandColors.some((color) => color.materialId == null);
		const materialIds = new Set(brandColors.map((color) => color.materialId));
		const nextMaterials = (body.materials as Material[]).filter((material) => {
			if (mode === 'basic' && !material.basic) return false;
			return universal || materialIds.has(material.id);
		});
		materials = nextMaterials;
		const stillThere = nextMaterials.some((material) => material.id === preferredMaterial);
		materialId = stillThere ? (preferredMaterial ?? null) : (nextMaterials[0]?.id ?? null);
		colors = brandColors.filter(
			(color) => color.materialId == null || color.materialId === materialId
		);
		colorId = null;
	}

	function onBrand(next: number) {
		brandId = next;
		loadBrand(next, materialId);
	}

	function onMaterial(next: number) {
		materialId = next;
		colorId = null;
		if (brandId == null) return;
		loading = true;
		fetch(`/api/catalog?brandId=${brandId}&materialId=${next}`)
			.then((response) => response.json())
			.then((body) => {
				colors = body.colors;
			})
			.catch(() => {
				error = 'Could not load colors.';
			})
			.finally(() => {
				loading = false;
			});
	}

	async function add() {
		if (brandId == null || materialId == null || colorId == null) return;
		saving = true;
		error = '';
		const response = await fetch('/api/inventory', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ brandId, materialId, colorId, rollCount })
		});
		saving = false;
		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			error = body.error ?? 'Could not add that filament.';
			return;
		}
		const body = await response.json();
		await goto(`/#item-${body.item.id}`);
	}
</script>

<svelte:head>
	<title>Add filament · Phil-ament</title>
</svelte:head>

<main class="main">
	<form
		class="stack"
		onsubmit={(event) => {
			event.preventDefault();
			add();
		}}
	>
		<label class="field">
			<span class="field-label">Brand</span>
			<span class="select-wrap">
				<select class="select" value={brandId ?? ''} onchange={(event) => onBrand(Number(event.currentTarget.value))}>
					{#each data.brands as brand (brand.id)}
						<option value={brand.id}>{brand.name}</option>
					{/each}
				</select>
			</span>
		</label>

		<label class="field">
			<span class="field-label">Type</span>
			{#if materials.length === 0}
				<p class="hint">No materials for this brand in the current Materials setting.</p>
			{:else}
				<span class="select-wrap">
					<select
						class="select"
						value={materialId ?? ''}
						onchange={(event) => onMaterial(Number(event.currentTarget.value))}
					>
						{#each materials as material (material.id)}
							<option value={material.id}>{material.name}</option>
						{/each}
					</select>
				</span>
			{/if}
		</label>

		<div class="field">
			<span class="field-label">Color</span>
			{#if loading}
				<p class="hint">Loading colors…</p>
			{:else if colors.length === 0}
				<p class="hint">No colors for this brand and type.</p>
			{:else}
				<div class="swatch-grid">
					{#each colors as color (color.id)}
						<button
							type="button"
							class="swatch"
							aria-pressed={colorId === color.id}
							title={color.name}
							onclick={() => (colorId = color.id)}
						>
							<span class="dot dot-lg" style:background={swatchBackground(color.hex)}></span>
							<span class="swatch-name">{color.name}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="field">
			<span class="field-label">Rolls</span>
			<Stepper size="lg" min={1} value={rollCount} onchange={(next) => (rollCount = next)} />
		</div>

		{#if error}<p class="error">{error}</p>{/if}
	</form>
</main>

<div class="dock">
	<button
		class="button"
		type="button"
		data-testid="add-submit"
		disabled={saving || colorId == null}
		onclick={add}
	>
		{saving ? 'Adding…' : colorId == null ? 'Choose a color' : 'Add to inventory'}
	</button>
	<p class="hint">If this filament is already in your inventory, the new rolls are added to its count.</p>
</div>
