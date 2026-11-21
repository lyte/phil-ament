<script lang="ts">
	import { page } from '$app/stores';

	const path = $derived($page.url.pathname);
	const onHome = $derived(path === '/');
	const onLogin = $derived(path === '/login');
</script>

<header class="header">
	<div>
		{#if !onHome && !onLogin}
			<a class="icon-button" href="/" aria-label="Back">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M15 5 L8 12 L15 19"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
		{/if}
	</div>
	<a class="logo-link" href="/" aria-label="Phil-ament home">
		<img class="logo logo-light" src="/logo-dark-on-light.svg" alt="" />
		<img class="logo logo-dark" src="/logo-white-on-dark.svg" alt="" />
	</a>
	<div>
		{#if !onLogin}
			<a
				class="icon-button"
				href="/settings"
				aria-label="Settings"
				aria-current={path.startsWith('/settings') ? 'page' : undefined}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linejoin="round"
						d="M10.2 2.8h3.6l.4 2.1c.6.2 1.2.6 1.7 1l2-.9 2.5 2.5-.9 2c.4.5.8 1.1 1 1.7l2.1.4v3.6l-2.1.4c-.2.6-.6 1.2-1 1.7l.9 2-2.5 2.5-2-.9c-.5.4-1.1.8-1.7 1l-.4 2.1h-3.6l-.4-2.1c-.6-.2-1.2-.6-1.7-1l-2 .9-2.5-2.5.9-2c-.4-.5-.8-1.1-1-1.7l-2.1-.4V9.6l2.1-.4c.2-.6.6-1.2 1-1.7l-.9-2 2.5-2.5 2 .9c.5-.4 1.1-.8 1.7-1l.4-2.1z"
					/>
					<circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7" />
				</svg>
			</a>
		{/if}
	</div>
</header>
