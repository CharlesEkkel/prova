<script lang="ts">
  // Variant A "Now playing": a full-screen music-player look. Big title, big transport, an
  // "Up next" strip, options in a sheet, score as a collapsible panel.
  import { fmt, kindLabel, type Performance } from '../data';
  import KindChip from '../KindChip.svelte';
  import Options from '../Options.svelte';
  import ScoreMock from '../ScoreMock.svelte';
  import Scrubber from '../Scrubber.svelte';
  import { currentItem, emptyPaused, go, player, queueOf, session, skipBy, toggle } from '../player.svelte';
  let { perf }: { perf: Performance } = $props();
  let sheet = $state(false);
  let score = $state(false);
  const q = $derived(queueOf(perf));
  const cur = $derived(currentItem());
  const idx = $derived(q.findIndex((x) => x.piece.id === cur?.piece.id));
  const nextItem = $derived(q[idx + 1]);
</script>

<div class="screen pad">
  <div class="row"><a href="/" class="small muted grow">‹ {perf.title}</a><button class="icon-btn" aria-label="Options" onclick={() => (sheet = !sheet)}>⚙</button></div>

  {#if session.done}
    <div class="center"><h1>That's the lot 🎶</h1><p class="muted">You played through {perf.title}.</p><button class="btn" onclick={() => (session.done = false)}>Close</button></div>
  {:else if cur}
    <p class="h-label">Piece {idx + 1} of {q.length}</p>
    <h1>{cur.piece.title}</h1>
    <p class="muted">{cur.piece.composer}</p>

    {#if emptyPaused()}
      <div class="card pause">
        <b>⏸ Paused: no Practice Tracks yet</b>
        <p class="small">{cur.piece.title} has nothing to play. Rehearse it from the score, then continue.</p>
        <button class="btn" onclick={() => go(1)}>Continue to next Piece</button>
      </div>
    {:else if cur.track}
      <div class="meta"><KindChip track={cur.track} /></div>
      <Scrubber track={cur.track} />
      <div class="row ctl">
        <button class="icon-btn" aria-label="Previous Piece" onclick={() => go(-1)}>⏮</button>
        <button class="icon-btn" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}>↺</button>
        <button class="icon-btn big" aria-label={player.playing ? 'Pause' : 'Play'} onclick={toggle}>{player.playing ? '❚❚' : '▶'}</button>
        <button class="icon-btn" aria-label="Forward 10 seconds" onclick={() => skipBy(10)}>↻</button>
        <button class="icon-btn" aria-label="Next Piece" onclick={() => go(1)}>⏭</button>
      </div>
    {/if}

    <button class="toggle" onclick={() => (score = !score)}>{score ? '▾' : '▸'} Choir score</button>
    {#if score}<ScoreMock piece={cur.piece} height={220} />{/if}

    <div class="card next">
      <span class="h-label">Up next</span>
      {#if nextItem}<b>{nextItem.piece.title}</b><span class="small muted">{nextItem.track ? kindLabel(nextItem.track) : 'no Practice Track yet'}{nextItem.track ? ' · ' + fmt(nextItem.track.durationSec) : ''}</span>
      {:else}<b>End of Performance</b>{/if}
    </div>
  {/if}
</div>

{#if sheet}
  <div class="sheet card pad"><h3>Play-through options</h3><Options /><button class="btn ghost" onclick={() => (sheet = false)}>Done</button></div>
{/if}

<style>
  h1 { font-size: 30px; line-height: 1.1; margin-top: 4px; }
  .meta { margin: 14px 0 4px; }
  .ctl { justify-content: space-between; margin: 10px 0 18px; }
  .toggle { min-height: 48px; text-align: left; color: var(--accent); font-weight: 600; }
  .next { margin-top: auto; padding: 14px; display: flex; flex-direction: column; gap: 2px; }
  .pause { padding: 16px; margin: 20px 0; display: flex; flex-direction: column; gap: 10px; border: 2px dashed var(--warn); }
  .center { margin: auto; text-align: center; display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .sheet { position: absolute; left: 8px; right: 8px; bottom: 64px; z-index: 20; box-shadow: 0 -8px 30px #0004; display: flex; flex-direction: column; gap: 8px; }
</style>
