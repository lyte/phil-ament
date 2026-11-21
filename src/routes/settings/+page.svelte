<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { applyAppearance } from '$lib/theme';
	import type { Appearance, MaterialsMode } from '$lib/types';

	let { data } = $props();
	let authDraft = $state(data.authEnabled);
	let password = $state('');
	let confirmPassword = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let message = $state('');
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		authDraft = data.authEnabled;
	});

	async function patch(body: Record<string, unknown>) {
		busy = true;
		error = '';
		message = '';
		const response = await fetch('/api/settings', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const payload = await response.json().catch(() => ({}));
		busy = false;
		if (!response.ok) {
			error = payload.error ?? 'Could not save settings.';
			return false;
		}
		await invalidateAll();
		return true;
	}

	async function setAppearance(appearance: Appearance) {
		applyAppearance(appearance);
		await patch({ appearance });
	}

	async function setMaterials(materialsMode: MaterialsMode) {
		await patch({ materialsMode });
	}

	async function enableLogin() {
		if (password !== confirmPassword) {
			error = 'Those passwords do not match.';
			return;
		}
		const ok = await patch({ authEnabled: true, password });
		if (ok) {
			password = '';
			confirmPassword = '';
			message = 'Login is on.';
		}
	}

	async function disableLogin() {
		const ok = await patch({ authEnabled: false });
		if (ok) message = 'Login is off.';
	}

	async function updatePassword() {
		const ok = await patch({ currentPassword, newPassword });
		if (ok) {
			currentPassword = '';
			newPassword = '';
			message = 'Password updated.';
		}
	}

	function download(format: 'csv' | 'json') {
		window.location.href = `/api/export?format=${format}`;
	}
</script>

<svelte:head>
	<title>Settings · Phil-ament</title>
</svelte:head>

<main class="main plain stack">
	<section class="panel">
		<h2>Appearance</h2>
		<div class="segmented" role="radiogroup" aria-label="Appearance">
			<button type="button" role="radio" data-testid="theme-system" aria-checked={data.appearance === 'system'} onclick={() => setAppearance('system')}>System</button>
			<button type="button" role="radio" data-testid="theme-light" aria-checked={data.appearance === 'light'} onclick={() => setAppearance('light')}>Light</button>
			<button type="button" role="radio" data-testid="theme-dark" aria-checked={data.appearance === 'dark'} onclick={() => setAppearance('dark')}>Dark</button>
		</div>
	</section>

	<section class="panel">
		<h2>Materials</h2>
		<div class="segmented" role="radiogroup" aria-label="Materials">
			<button type="button" role="radio" data-testid="materials-basic" aria-checked={data.materialsMode === 'basic'} onclick={() => setMaterials('basic')}>Basic</button>
			<button type="button" role="radio" data-testid="materials-full" aria-checked={data.materialsMode === 'full'} onclick={() => setMaterials('full')}>Full</button>
		</div>
		<p class="hint">
			Basic shows PLA, PETG, TPU, ABS, and their variants. Full shows every material in the catalog.
		</p>
	</section>

	<section class="panel">
		<h2>Login</h2>
		<div class="switch-row">
			<p class="hint" style="margin: 0;">
				{data.authEnabled
					? 'A password is required on this server.'
					: 'Off. Anyone on your network can open this app.'}
			</p>
			<button
				type="button"
				class="switch"
				role="switch"
				aria-checked={authDraft}
				aria-label="Require login"
				onclick={() => (authDraft = !authDraft)}
			>
				<span></span>
			</button>
		</div>
		{#if !data.authEnabled && authDraft}
			<label class="field" style="margin-top: 12px;">
				<span class="field-label">Password</span>
				<input class="text-input" type="password" autocomplete="new-password" bind:value={password} />
			</label>
			<label class="field">
				<span class="field-label">Confirm password</span>
				<input class="text-input" type="password" autocomplete="new-password" bind:value={confirmPassword} />
			</label>
			<button class="button" type="button" disabled={busy} onclick={enableLogin}>Turn on login</button>
			<p class="hint">The password is stored as a hash. At least 8 characters.</p>
		{/if}
		{#if data.authEnabled}
			<label class="field" style="margin-top: 12px;">
				<span class="field-label">Current password</span>
				<input class="text-input" type="password" autocomplete="current-password" bind:value={currentPassword} />
			</label>
			<label class="field">
				<span class="field-label">New password</span>
				<input class="text-input" type="password" autocomplete="new-password" bind:value={newPassword} />
			</label>
			<button class="button secondary" type="button" disabled={busy} onclick={updatePassword}>Update password</button>
			<button class="danger" type="button" disabled={busy} onclick={disableLogin}>Turn off login</button>
		{/if}
	</section>

	<section class="panel">
		<h2>Export</h2>
		<div class="actions">
			<button class="button secondary" type="button" onclick={() => download('csv')}>Download CSV</button>
			<button class="button secondary" type="button" onclick={() => download('json')}>Download JSON</button>
		</div>
	</section>

	<section class="panel about">
		<h2>About</h2>
		<p>Phil-ament {data.version}</p>
		<p class="hint">by futuristicvlad</p>
		<p class="hint">
			Colors and hot-end temperatures are seeded from
			<a href="https://github.com/Donkie/SpoolmanDB">SpoolmanDB</a>
			by Donkie and contributors, under the MIT License.
		</p>
		<p><a href="https://github.com/lyte/phil-ament">GitHub</a></p>
	</section>

	{#if error}<p class="error">{error}</p>{/if}
	{#if message}<p class="hint">{message}</p>{/if}

	<section class="panel donate">
		<h2>Donate</h2>
		<p>
			If you like this project and want to donate click a link below. Regardless this is provided FREE to all and donating below will not unlock any hidden features but will gain my overwhelming appreciation and help support the continued maintenance and future development.
		</p>
		<div class="donate-links">
			<a
				class="button"
				href="https://www.paypal.com/paypalme/vladhernandez/5"
				target="_blank"
				rel="noopener noreferrer"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M4.5 9h11.2v5.2a3.6 3.6 0 0 1-3.6 3.6H8.1a3.6 3.6 0 0 1-3.6-3.6V9z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linejoin="round"
					/>
					<path
						d="M15.7 10.2h1.2a2.2 2.2 0 0 1 0 4.4h-1.2"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M7.2 5.2v1.6M10.2 4.2v2.2M13.2 5.2v1.6"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
					/>
				</svg>
				Buy me a Coffee
			</a>
			<a
				class="button"
				href="https://www.paypal.com/paypalme/vladhernandez/20"
				target="_blank"
				rel="noopener noreferrer"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M4 10.2c0-3 3.6-5.2 8-5.2s8 2.2 8 5.2H4z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linejoin="round"
					/>
					<circle cx="8" cy="7.2" r="0.65" fill="currentColor" />
					<circle cx="12" cy="6.3" r="0.65" fill="currentColor" />
					<circle cx="16" cy="7.2" r="0.65" fill="currentColor" />
					<path
						d="M3.6 12.6q1.4-1.2 2.8 0t2.8 0t2.8 0t2.8 0t2.8 0"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M4.2 15.5h15.6"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
					/>
					<path
						d="M5 17.2h14c0 2-2.8 3.5-7 3.5s-7-1.5-7-3.5z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linejoin="round"
					/>
				</svg>
				Buy me Lunch
			</a>
		</div>
	</section>
</main>
