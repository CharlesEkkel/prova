<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';

  const { children }: { readonly children: Snippet } = $props();
</script>

{@render children()}
