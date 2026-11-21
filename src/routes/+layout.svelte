<script lang="ts">
	import { onMount } from 'svelte';
	import { applyAppearance } from '$lib/theme';
	import Header from '$lib/components/Header.svelte';
	import UndoToast from '$lib/components/UndoToast.svelte';
	import '../app.css';

	let { data, children } = $props();

	onMount(() => {
		applyAppearance(data.appearance);
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			const stored = localStorage.getItem('philament-theme') || 'system';
			if (stored === 'system') applyAppearance('system');
		};
		media.addEventListener('change', onChange);
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
		return () => media.removeEventListener('change', onChange);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		applyAppearance(data.appearance);
	});
</script>

<div class="app">
	<Header />
	{@render children()}
	<UndoToast />
</div>
