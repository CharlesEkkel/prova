<script lang="ts">
  // Variant C "Score-first": the choir score is the hero (read while you listen). Combined Track
  // is a permanently pinned dark button; part tracks scroll horizontally; transport docks at bottom.
  import { combinedOf, fmt, isOverridden, partFor, type Piece } from '../data';
  import KindChip from '../KindChip.svelte';
  import ScoreMock from '../ScoreMock.svelte';
  import Scrubber from '../Scrubber.svelte';
  import { isCurrent, isPlaying, load, player, playTrack, skipBy, toggle } from '../player.svelte';
  let { piece }: { piece: Piece } = $props();
  const combined = $derived(combinedOf(piece));
  const parts = $derived(piece.tracks.filter((t) => t.part));
  const mine = $derived(partFor(piece.id));
</script>

<div class="screen">
  <div class="pad head">
    <a href="/" class="small muted">‹ Home</a>
    <h1>{piece.title}</h1>
    <p class="small muted">{piece.composer} · you: <b>{mine}</b>{#if isOverridden(piece.id)} (override){/if}</p>
  </div>

  <div class="pad"><ScoreMock {piece} height={300} />
    {#if piece.scores.length > 1}<p class="small muted others">Also: {piece.scores.filter((s) => !s.choir).map((s) => s.label).join(', ')}</p>{/if}
  </div>

  <div class="dock">
    <div class="picker">
      {#if combined}
        <button class="pin" class:active={isCurrent(combined)} onclick={() => load(combined)} aria-label="Play Combined Track">
          <KindChip track={combined} />
        </button>
      {:else}<span class="pin none small">No Combined Track</span>{/if}
      <div class="scroller">
        {#each parts as t}
          <button class="pt" class:mine={t.part === mine} class:active={isCurrent(t)} onclick={() => playTrack(t)}>
            <KindChip track={t} />{#if t.part === mine}<small>★ yours</small>{/if}
          </button>
        {:else}<span class="muted small">No part tracks yet</span>{/each}
      </div>
    </div>
    {#if player.track}
      <Scrubber track={player.track} />
      <div class="row ctl">
        <span class="small muted">{player.track.part ?? 'Combined'} · {fmt(player.track.durationSec)}</span>
        <span class="grow"></span>
        <button class="icon-btn" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}>↺</button>
        <button class="icon-btn big small-big" aria-label={player.playing ? 'Pause' : 'Play'} onclick={toggle}>{player.playing ? '❚❚' : '▶'}</button>
      </div>
    {:else}
      <p class="small muted pad">Pick a track to start. Your score stays on screen.</p>
    {/if}
  </div>
</div>

<style>
  h1 { font-size: 22px; }
  .head { padding-bottom: 4px; }
  .others { margin-top: 6px; }
  .dock { position: sticky; bottom: 0; margin-top: auto; background: var(--surface); border-top: 1px solid var(--line); padding: 10px 14px 62px; box-shadow: 0 -4px 14px #0001; }
  .picker { display: flex; gap: 8px; align-items: stretch; margin-bottom: 6px; }
  .pin { flex: none; min-height: 56px; padding: 0 10px; border-radius: 12px; border: 3px solid transparent; background: var(--bg); }
  .pin.active, .pt.active { border-color: var(--accent); }
  .pin.none { display: grid; place-items: center; }
  .scroller { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
  .pt { flex: none; min-height: 56px; padding: 0 10px; border-radius: 12px; border: 3px solid transparent; background: var(--bg); display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 2px; }
  .pt.mine { background: #fff3c4; }
  .pt small { font-size: 11px; color: #7a5b00; }
  .small-big { width: 56px; height: 56px; font-size: 22px; }
</style>
