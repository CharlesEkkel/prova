<script lang="ts">
  import AudioLines from '@lucide/svelte/icons/audio-lines';
  import type { Performance } from '../data';
  import { currentItem, jumpTo, player, queueOf, session } from '../player.svelte';
  import KindBadge from './KindBadge.svelte';
  let { perf }: { perf: Performance } = $props();
  const q = $derived(queueOf(perf));
  const cur = $derived(currentItem());
</script>

<ol class="flex flex-col gap-1.5">
  {#each q as item, i (item.piece.id)}
    {@const here = !session.done && item.piece.id === cur?.piece.id}
    <li>
      <button onclick={() => jumpTo(item.piece.id)} class="flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition {here ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : item.track ? 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900' : 'border-dashed border-zinc-300 dark:border-zinc-700'}">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {#if here && player.playing}<AudioLines class="size-4 text-violet-600" />{:else}{i + 1}{/if}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{item.piece.title}</span>
          {#if !item.track}<span class="text-xs text-amber-700 dark:text-amber-400">no Practice Track yet</span>{/if}
        </span>
        {#if item.track}<KindBadge track={item.track} />{/if}
      </button>
    </li>
  {/each}
</ol>
