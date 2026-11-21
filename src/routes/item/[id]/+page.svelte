<script lang="ts">
	import { goto } from '$app/navigation';
	import Stepper from '$lib/components/Stepper.svelte';
	import { hotEndLabel, swatchBackground, weightLabel } from '$lib/format';
	import { offerUndo } from '$lib/undo';

	let { data } = $props();
	let rollCount = $state(data.item.rollCount);
	let notes = $state(data.item.notes);
	let confirming = $state(false);
	let saving = $state(false);
	let error = $state('');

	$effect(() => {
		rollCount = data.item.rollCount;
		notes = data.item.notes;
	});

	const hotEnd = $derived(hotEndLabel(data.item));

	async function save() {
		saving = true;
		error = '';
		const response = await fetch(`/api/inventory/${data.item.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ rollCount, notes })
		});
		saving = false;
		if (!response.ok) {
			error = 'Could not save.';
			return;
		}
		await goto(`/#item-${data.item.id}`);
	}

	async function remove() {
		saving = true;
		error = '';
		const response = await fetch(`/api/inventory/${data.item.id}`, { method: 'DELETE' });
		saving = false;
		if (!response.ok) {
			error = 'Could not delete.';
			return;
		}
		offerUndo({
			brandId: data.item.brandId,
			materialId: data.item.materialId,
			colorId: data.item.colorId,
			rollCount: data.item.rollCount,
			notes: data.item.notes
		});
		await goto('/');
	}
</script>

<svelte:head>
	<title>{data.item.colorName} · Phil-ament</title>
</svelte:head>

<main class="main plain">
	<div class="hero">
		<span class="dot dot-xl" style:background={swatchBackground(data.item.hex)}></span>
		<h1>{data.item.colorName}</h1>
		<p class="sub">
			{data.item.brandName} · {data.item.materialName} · {weightLabel(data.item.rollWeightG)}
		</p>
		{#if hotEnd}<p class="hotend" data-testid="hot-end">Hot end {hotEnd}</p>{/if}
	</div>

	<form
		class="stack"
		onsubmit={(event) => {
			event.preventDefault();
			save();
		}}
	>
		<div class="field">
			<span class="field-label">Rolls on hand</span>
			<Stepper size="lg" value={rollCount} onchange={(next) => (rollCount = next)} />
		</div>
		<label class="field">
			<span class="field-label">Notes</span>
			<textarea class="notes" bind:value={notes} maxlength="2000" placeholder="Optional notes"></textarea>
		</label>
		{#if error}<p class="error">{error}</p>{/if}
		<button class="button" type="submit" data-testid="save-item" disabled={saving}>
			{saving ? 'Saving…' : 'Save'}
		</button>
	</form>

	<div class="actions" style="margin-top: 12px;">
		{#if confirming}
			<div class="confirm">
				<p>Delete this filament? You can undo it for a few seconds.</p>
				<div class="actions">
					<button class="button" type="button" disabled={saving} onclick={remove}>Delete</button>
					<button class="button secondary" type="button" onclick={() => (confirming = false)}>Cancel</button>
				</div>
			</div>
		{:else}
			<button class="danger" type="button" onclick={() => (confirming = true)}>Delete item</button>
		{/if}
	</div>
</main>
