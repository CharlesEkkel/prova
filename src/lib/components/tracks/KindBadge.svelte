<script lang="ts">
  // What kind of track this is. Combined is solid, part-only outlined, part-predominant tinted, and
  // each has an icon and words, so colour is never the only cue.
  import { Mic, SlidersHorizontal, Users } from '@lucide/svelte';
  import {
    badgeStyleOf,
    kindText,
    type BadgeStyle,
    type TrackSource,
  } from '../../core/practice-tracks';

  const { source }: { readonly source: TrackSource } = $props();

  const looks: Readonly<Record<BadgeStyle, string>> = {
    solid: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
    outlined: 'border border-zinc-400 text-zinc-700 dark:border-zinc-500 dark:text-zinc-300',
    tinted:
      'border border-primary-400 bg-primary-50 text-primary-800 dark:border-primary-500/60 dark:bg-primary-500/10 dark:text-primary-300',
  };
  const style = $derived(badgeStyleOf(source));
</script>

<span
  data-testid="kind-badge"
  data-style={style}
  class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap {looks[
    style
  ]}"
>
  {#if style === 'solid'}
    <Users class="size-3.5" aria-hidden="true" />
  {:else if style === 'outlined'}
    <Mic class="size-3.5" aria-hidden="true" />
  {:else}
    <SlidersHorizontal class="size-3.5" aria-hidden="true" />
  {/if}
  {kindText(source)}
</span>
