<script lang="ts">
  import CirclePause from '@lucide/svelte/icons/circle-pause';
  import Btn from './Btn.svelte';
  import { go } from '../player.svelte';
  let { title }: { title: string } = $props();
</script>

<div class="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-amber-500/70 bg-amber-50 p-5 dark:bg-amber-500/10">
  <div class="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300"><CirclePause class="size-5" /> Paused: no Practice Tracks yet</div>
  <p class="text-sm text-zinc-600 dark:text-zinc-400">{title} has nothing to play. Rehearse it from the score, then continue.</p>
  <Btn onclick={() => go(1)} class="self-start">Continue to next Piece</Btn>
</div>
