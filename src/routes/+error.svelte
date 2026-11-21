<script lang="ts">
	import { page } from '$app/stores';
</script>

<main class="main plain">
	<div class="hero">
		<h1>{$page.status}</h1>
		<p class="sub">{$page.error?.message ?? 'Something went wrong.'}</p>
		<a class="button" href="/">Back to inventory</a>
	</div>
</main>
