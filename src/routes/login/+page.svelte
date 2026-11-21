<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Sign in · Phil-ament</title>
</svelte:head>

<main class="main plain">
	<form class="stack" method="POST">
		<div class="hero">
			<h1>Sign in</h1>
			<p class="sub">This server asks for a password.</p>
		</div>
		<label class="field">
			<span class="field-label">Password</span>
			<input class="text-input" type="password" name="password" autocomplete="current-password" required />
		</label>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<button class="button" type="submit">Sign in</button>
	</form>
</main>
