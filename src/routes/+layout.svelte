<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';
  import type { LayoutData } from './$types';

  const { data, children }: { readonly data: LayoutData; readonly children: Snippet } = $props();

  // The server puts the theme on <html> in the first response; this keeps it current afterwards,
  // for example when an Admin saves a different one.
  $effect(() => {
    document.documentElement.dataset['accent'] = data.colourTheme;
  });
</script>

{@render children()}
