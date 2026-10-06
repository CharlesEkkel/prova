<script lang="ts">
  import Users from '@lucide/svelte/icons/users';
  import Mic from '@lucide/svelte/icons/mic';
  import Sliders from '@lucide/svelte/icons/sliders-horizontal';
  import { kindLabel, type Track } from '../data';
  let { track }: { track: Track } = $props();
  // Combined = solid; part-only = outline; part-predominant = tinted outline. Icon + text, never colour alone.
  const style = {
    combined: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
    'part-only': 'border border-zinc-400 text-zinc-700 dark:border-zinc-500 dark:text-zinc-300',
    'part-predominant': 'border border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-500/60 dark:bg-violet-500/10 dark:text-violet-300'
  };
</script>

<span class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap {style[track.kind]}">
  {#if track.kind === 'combined'}<Users class="size-3.5" />{:else if track.kind === 'part-only'}<Mic class="size-3.5" />{:else}<Sliders class="size-3.5" />{/if}
  {kindLabel(track)}
</span>
