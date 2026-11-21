<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { clearUndo, undoStore } from '$lib/undo';

	let busy = $state(false);
	let failed = $state(false);

	async function undo(payload: NonNullable<typeof $undoStore>) {
		busy = true;
		failed = false;
		const response = await fetch('/api/inventory', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		busy = false;
		if (!response.ok) {
			failed = true;
			return;
		}
		clearUndo();
		await invalidateAll();
	}
</script>

{#if $undoStore}
	<div class="toast" role="status">
		<span>{failed ? 'Could not restore it' : 'Removed from inventory'}</span>
		<button type="button" disabled={busy} onclick={() => $undoStore && undo($undoStore)}>
			{busy ? 'Restoring…' : 'Undo'}
		</button>
	</div>
{/if}
