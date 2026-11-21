<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Stepper from '$lib/components/Stepper.svelte';
	import { isLow, summaryLine, swatchBackground } from '$lib/format';
	import { matchesChip, matchesSearch, materialChips } from '$lib/filters';
	import type { InventoryItem } from '$lib/types';

	let { data } = $props();
	let items = $state<InventoryItem[]>(data.items.map((item) => ({ ...item })));
	let query = $state('');
	let chip = $state('all');
	let error = $state('');

	$effect(() => {
		items = data.items.map((item) => ({ ...item }));
	});

	const chips = $derived(materialChips(items));
	const visible = $derived(
		items.filter((item) => matchesChip(item, chip) && matchesSearch(item, query))
	);
	const summary = $derived(
		summaryLine(
			visible.reduce((sum, item) => sum + item.rollCount, 0),
			visible.length
		)
	);

	$effect(() => {
		if (!chips.some((entry) => entry.id === chip)) chip = 'all';
	});

	const desired = new Map<number, number>();
	const inflight = new Set<number>();

	async function pump(id: number) {
		if (inflight.has(id)) return;
		inflight.add(id);
		try {
			while (desired.has(id)) {
				const target = desired.get(id)!;
				desired.delete(id);
				const response = await fetch(`/api/inventory/${id}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ rollCount: target })
				});
				if (!response.ok) throw new Error('update failed');
				const body = await response.json();
				if (!desired.has(id)) {
					items = items.map((item) => (item.id === id ? body.item : item));
				}
			}
			error = '';
		} catch {
			error = 'Could not update the count.';
			await invalidateAll();
		} finally {
			inflight.delete(id);
			if (desired.has(id)) pump(id);
		}
	}

	function setCount(item: InventoryItem, next: number) {
		items = items.map((row) => (row.id === item.id ? { ...row, rollCount: next } : row));
		desired.set(item.id, next);
		pump(item.id);
	}
</script>

<svelte:head>
	<title>Phil-ament</title>
</svelte:head>

<main class="main">
	<input class="search" type="search" placeholder="Search brand, type, or color" bind:value={query} />
	<div class="chips" role="toolbar" aria-label="Material">
		{#each chips as entry (entry.id)}
			<button
				type="button"
				class="chip"
				aria-pressed={chip === entry.id}
				onclick={() => (chip = entry.id)}
			>
				{entry.label}
			</button>
		{/each}
	</div>
	<p class="summary">{summary}</p>
	{#if error}<p class="error">{error}</p>{/if}
	{#if visible.length === 0}
		<p class="empty">
			{items.length === 0 ? 'No filament yet. Add a roll to start counting.' : 'Nothing matches that search.'}
		</p>
	{:else}
		<ul class="rows">
			{#each visible as item (item.id)}
				<li class="row" id="item-{item.id}">
					<a class="row-link" href="/item/{item.id}">
						<span class="dot" style:background={swatchBackground(item.hex)}></span>
						<span class="row-text">
							<span class="row-title">{item.colorName}</span>
							<span class="row-meta">
								{item.brandName} · {item.materialName}
								{#if isLow(item.rollCount)}<span class="low">Low</span>{/if}
							</span>
						</span>
					</a>
					<Stepper value={item.rollCount} onchange={(next) => setCount(item, next)} />
				</li>
			{/each}
		</ul>
	{/if}
</main>

<div class="dock">
	<a class="button" href="/add" data-testid="add-filament">+ Add filament</a>
</div>
