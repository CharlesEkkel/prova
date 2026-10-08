<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  const { children, ...button }: HTMLButtonAttributes = $props();
</script>

<button
  {...button}
  class="min-h-11 w-full rounded bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-60"
>
  {@render children?.()}
</button>
