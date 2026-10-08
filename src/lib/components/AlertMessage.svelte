<script lang="ts">
  import type { Snippet } from 'svelte';

  const { children }: { readonly children: Snippet } = $props();
</script>

<p
  role="alert"
  class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
>
  {@render children()}
</p>
