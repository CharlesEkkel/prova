<script lang="ts">
  // Variant A "Part-first list": Your part first, Combined always visible, other parts collapsed,
  // Scores below, sticky mini-player docked at the bottom.
  import { VOICE_PARTS, combinedOf, fmt, isOverridden, partFor, partTracksOf, type Piece } from '../data';
  import KindChip from '../KindChip.svelte';
  import Scrubber from '../Scrubber.svelte';
  import { isPlaying, player, playTrack, skipBy, toggle } from '../player.svelte';
  let { piece }: { piece: Piece } = $props();
  let showOthers = $state(false);
  const mine = $derived(partTracksOf(piece, partFor(piece.id)));
  const combined = $derived(combinedOf(piece));
  const others = $derived(piece.tracks.filter((t) => t.part && t.part !== partFor(piece.id)));
  void VOICE_PARTS;
</script>

<div class="screen">
  <div class="pad">
    <a href="/" class="small muted">‹ Home</a>
    <h1>{piece.title}</h1>
    <p class="muted">{piece.composer}</p>

    <h2 class="h-label sec">Your part: {partFor(piece.id)} {#if isOverridden(piece.id)}<span class="ov">Part Override</span>{/if}</h2>
    {#each mine as t}
      {@render trackRow(t, true)}
    {:else}
      <p class="empty card pad small">No {partFor(piece.id)} Practice Track yet. Use the Combined Track below.</p>
    {/each}

    <h2 class="h-label sec">Everyone together</h2>
    {#if combined}{@render trackRow(combined, false)}{:else}<p class="empty card pad small">No Combined Track yet.</p>{/if}

    {#if others.length}
      <button class="more" onclick={() => (showOthers = !showOthers)}>{showOthers ? '▾' : '▸'} Other Voice Parts ({others.length})</button>
      {#if showOthers}{#each others as t}{@render trackRow(t, false)}{/each}{/if}
    {/if}

    <h2 class="h-label sec">Scores</h2>
    {#each piece.scores as s}
      <a class="card row score" href="#score"><span class="grow">{s.label}</span>{#if s.choir}<b class="choir">Choir score</b>{/if}<span>›</span></a>
    {:else}
      <p class="muted small">No Scores uploaded.</p>
    {/each}
  </div>
</div>

{#if player.track}
  <div class="mini">
    <div class="row">
      <div class="grow small"><b>{player.track.part ?? 'Combined'}</b> · {piece.title}</div>
      <button class="icon-btn" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}>↺</button>
      <button class="icon-btn" aria-label={player.playing ? 'Pause' : 'Play'} onclick={toggle}>{player.playing ? '❚❚' : '▶'}</button>
    </div>
    <Scrubber track={player.track} />
  </div>
{/if}

{#snippet trackRow(t, strong)}
  <div class="card trk" class:strong>
    <button class="icon-btn" aria-label="{isPlaying(t) ? 'Pause' : 'Play'} {t.part ?? 'Combined'} track" onclick={() => playTrack(t)}>{isPlaying(t) ? '❚❚' : '▶'}</button>
    <div class="grow"><KindChip track={t} /></div>
    <span class="small muted">{fmt(t.durationSec)}</span>
  </div>
{/snippet}

<style>
  h1 { font-size: 26px; margin-top: 6px; }
  .sec { margin: 22px 0 8px; display: flex; gap: 8px; align-items: center; }
  .ov { background: #fff3c4; color: #7a5b00; padding: 1px 8px; border-radius: 6px; text-transform: none; letter-spacing: 0; }
  .trk { display: flex; align-items: center; gap: 12px; padding: 8px 14px 8px 8px; margin-bottom: 8px; }
  .trk.strong { border: 2px solid var(--accent); }
  .more { min-height: 48px; color: var(--accent); font-weight: 600; }
  .empty { color: var(--muted); border-style: dashed; }
  .score { padding: 0 14px; min-height: 52px; margin-bottom: 8px; }
  .choir { font-size: 11px; background: var(--accent-soft); color: var(--accent); padding: 2px 8px; border-radius: 99px; }
  .mini { flex: none; background: var(--surface); border-top: 1px solid var(--line); padding: 8px 14px 4px; margin-bottom: 56px; box-shadow: 0 -4px 14px #0001; }
</style>
