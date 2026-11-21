<script lang="ts">
	let {
		value,
		min = 0,
		max = 999,
		disabled = false,
		size = 'md',
		onchange
	}: {
		value: number;
		min?: number;
		max?: number;
		disabled?: boolean;
		size?: 'md' | 'lg';
		onchange: (next: number) => void;
	} = $props();
</script>

<div class="stepper" class:stepper-lg={size === 'lg'}>
	<button
		type="button"
		aria-label="Fewer rolls"
		disabled={disabled || value <= min}
		onclick={() => onchange(value - 1)}
	>
		−
	</button>
	<span class="stepper-value">{value}</span>
	<button
		type="button"
		aria-label="More rolls"
		disabled={disabled || value >= max}
		onclick={() => onchange(value + 1)}
	>
		+
	</button>
</div>
