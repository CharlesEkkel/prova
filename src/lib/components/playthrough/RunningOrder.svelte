<script lang="ts">
  // A Play-through's running order: every Piece with what the Singer would hear on it, the current
  // one highlighted and the ones with nothing to play dashed. Tapping a row jumps there.
  import { overviewRowText, type PlaythroughEntry } from '../../core/playthrough';
  import type { RunPiece } from '../../core/playthrough-run';
  import HeardLabel from '../HeardLabel.svelte';

  const {
    entries,
    currentIndex,
    onJump,
  }: {
    readonly entries: readonly PlaythroughEntry<RunPiece>[];
    /** The Piece the Play-through is at, or null when it is over. */
    readonly currentIndex: number | null;
    readonly onJump: (index: number) => void;
  } = $props();
</script>

<section aria-labelledby="running-order-heading">
  <h2
    id="running-order-heading"
    class="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase"
  >
    Running order
  </h2>
  <ol class="flex flex-col gap-1.5">
    {#each entries as entry, index (entry.piece.id)}
      <li>
        <button
          type="button"
          onclick={() => {
            onJump(index);
          }}
          aria-current={index === currentIndex ? 'true' : undefined}
          class="flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 {entry.kind ===
          'play'
            ? 'border-transparent'
            : 'border-dashed border-zinc-300 dark:border-zinc-700'} {index === currentIndex
            ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-500/10'
            : ''} {entry.kind === 'skip' ? 'opacity-60' : ''}"
        >
          <span class="w-5 shrink-0 text-zinc-400">{index + 1}</span>
          <span class="min-w-0 flex-1 truncate font-medium">{entry.piece.title}</span>
          <HeardLabel text={overviewRowText(entry)} playable={entry.heard.playable} />
        </button>
      </li>
    {/each}
  </ol>
</section>
