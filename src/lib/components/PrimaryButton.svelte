<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Btn from './ui/Btn.svelte';

  const { children, ...button }: HTMLButtonAttributes = $props();
</script>

<Btn {...button} class="w-full">
  {@render children?.()}
</Btn>
