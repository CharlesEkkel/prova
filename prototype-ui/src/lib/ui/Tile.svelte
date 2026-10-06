<script lang="ts">
  // A whole-surface click target that opens a Performance overview. A div (not <button>) so tiles can hold
  // headings and lists; keyboard-operable via Enter/Space.
  import type { Snippet } from 'svelte';
  import { openOverview } from '../ui.svelte';
  let { perfId, label, class: cls = '', children }: { perfId: string; label: string; class?: string; children: Snippet } = $props();
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openOverview(perfId);
    }
  }
</script>

<div role="button" tabindex="0" aria-label={label} onclick={() => openOverview(perfId)} {onkeydown} class="cursor-pointer text-left transition {cls}">
  {@render children()}
</div>
