<script lang="ts">
  // Variant B "Player-first + part picker": a big player card on top, a segmented Voice Part
  // picker (S A T B + All) that selects which Practice Track is loaded. Scores in a tab strip.
  import { VOICE_PARTS, combinedOf, fmt, isOverridden, partFor, partTracksOf, type Piece, type VoicePart } from '../data';
  import KindChip from '../KindChip.svelte';
  import ScoreMock from '../ScoreMock.svelte';
  import Scrubber from '../Scrubber.svelte';
  import { isCurrent, load, player, skipBy, toggle } from '../player.svelte';
  let { piece }: { piece: Piece } = $props();
  let pick = $state<VoicePart | 'All'>(partFor(piece.id));
  const tracks = $derived(pick === 'All' ? [combinedOf(piece)].filter(Boolean) : partTracksOf(piece, pick));
  const track = $derived(tracks[0]);
  let tab = $state<'tracks' | 'scores'>('tracks');
  function choose(p: VoicePart | 'All') {
    pick = p;
    const next = p === 'All' ? combinedOf(piece) : partTracksOf(piece, p)[0];
    if (next) load(next);
  }
  const symbol = { Soprano: 'S', Alto: 'A', Tenor: 'T', Bass: 'B' };
</script>

<div class="screen pad">
  <a href="/" class="small muted">‹ Home</a>
  <h1>{piece.title}</h1>
  <p class="muted small">{piece.composer}</p>

  <div class="card player">
    {#if track}
      <div class="row"><KindChip track={track} /><span class="grow"></span><span class="small muted">{fmt(track.durationSec)}</span></div>
      <Scrubber {track} />
      <div class="row ctl">
        <button class="icon-btn" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}>↺10</button>
        <button class="icon-btn big" aria-label={isCurrent(track) && player.playing ? 'Pause' : 'Play'}
          onclick={() => (isCurrent(track) ? toggle() : load(track))}>{isCurrent(track) && player.playing ? '❚❚' : '▶'}</button>
        <button class="icon-btn" aria-label="Forward 10 seconds" onclick={() => skipBy(10)}>10↻</button>
      </div>
    {:else}
      <p class="muted pad">No Practice Track for {pick} yet.</p>
    {/if}
  </div>

  <div class="seg" role="radiogroup" aria-label="Voice Part">
    {#each VOICE_PARTS as p}
      <button role="radio" aria-checked={pick === p} class:on={pick === p} onclick={() => choose(p)} aria-label={p}>
        {symbol[p]}{#if p === partFor(piece.id)}<i>★</i>{/if}
      </button>
    {/each}
    <button role="radio" aria-checked={pick === 'All'} class:on={pick === 'All'} class="all" onclick={() => choose('All')}>ALL</button>
  </div>
  <p class="small muted legend">★ your part{#if isOverridden(piece.id)} (Part Override for this Piece){/if}. ALL = Combined Track.</p>

  <div class="tabs">
    <button class:on={tab === 'tracks'} onclick={() => (tab = 'tracks')}>Practice Tracks ({piece.tracks.length})</button>
    <button class:on={tab === 'scores'} onclick={() => (tab = 'scores')}>Scores ({piece.scores.length})</button>
  </div>
  {#if tab === 'tracks'}
    {#each piece.tracks as t}
      <button class="card trk" onclick={() => { pick = t.part ?? 'All'; load(t); }}>
        <KindChip track={t} /><span class="grow"></span><span class="small muted">{isCurrent(t) && player.playing ? 'playing…' : fmt(t.durationSec)}</span>
      </button>
    {:else}<p class="muted">No Practice Tracks yet.</p>{/each}
  {:else}
    <ScoreMock {piece} height={200} />
    <ul class="slist">{#each piece.scores as s}<li>{s.label}{#if s.choir} <b>(choir score)</b>{/if}</li>{/each}</ul>
  {/if}
</div>

<style>
  h1 { font-size: 24px; margin-top: 4px; }
  .player { padding: 14px; margin: 12px 0; display: flex; flex-direction: column; gap: 6px; }
  .ctl { justify-content: center; gap: 22px; }
  .seg { display: flex; gap: 6px; }
  .seg button { flex: 1; min-height: 56px; border-radius: 12px; border: 2px solid var(--ink); font-weight: 800; font-size: 20px; background: #fff; position: relative; }
  .seg button.on { background: var(--ink); color: #fff; }
  .seg .all { font-size: 15px; flex: 1.3; }
  .seg i { position: absolute; top: 2px; right: 6px; font-size: 11px; font-style: normal; color: #e0a800; }
  .legend { margin: 6px 0 14px; }
  .tabs { display: flex; border-bottom: 1px solid var(--line); margin-bottom: 10px; }
  .tabs button { flex: 1; min-height: 44px; color: var(--muted); font-weight: 600; border-bottom: 3px solid transparent; }
  .tabs button.on { color: var(--accent); border-bottom-color: var(--accent); }
  .trk { display: flex; align-items: center; width: 100%; padding: 0 14px; min-height: 52px; margin-bottom: 8px; text-align: left; }
  .slist { padding-left: 18px; }
</style>
