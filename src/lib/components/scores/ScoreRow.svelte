<script lang="ts">
  // One Score in the panel: its label, marked when it is the choir score. Tapping it opens the Score
  // full screen; nothing opens on its own.
  import { FileText } from '@lucide/svelte';
  import type { Score } from '../../core/scores';

  const { score, onOpen }: { readonly score: Score; readonly onOpen: () => void } = $props();
</script>

<button
  type="button"
  onclick={onOpen}
  class="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
>
  <FileText class="size-5 shrink-0 text-zinc-400" aria-hidden="true" />
  <span class="min-w-0 flex-1 truncate">{score.label}</span>
  {#if score.isChoirScore}
    <span
      data-testid="choir-badge"
      class="shrink-0 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
      >Choir score</span
    >
  {/if}
</button>
