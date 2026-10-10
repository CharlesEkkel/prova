<script lang="ts">
  // One track in the Practice Tracks panel: its kind badge, what it is called, and how long it is.
  import { durationText, type PracticeTrack } from '../../core/practice-tracks';
  import KindBadge from './KindBadge.svelte';

  const {
    track,
    title,
    partName,
  }: {
    readonly track: PracticeTrack;
    /** The label, or what the track is when it has none. */
    readonly title: string;
    /** The Voice Part's name, shown beside a label so the row says both. Empty for none. */
    readonly partName: string;
  } = $props();

  const length = $derived(durationText(track.durationSeconds));
</script>

<div class="flex min-h-12 items-center gap-3 px-2 text-sm">
  <KindBadge source={track.source} />
  <span class="min-w-0 flex-1 truncate">
    {title}
    {#if partName !== ''}<span class="text-zinc-500">· {partName}</span>{/if}
  </span>
  {#if length !== null}<span class="text-zinc-500 tabular-nums">{length}</span>{/if}
</div>
