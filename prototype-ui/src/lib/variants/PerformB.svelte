<script lang="ts">
  // Variant B "Setlist": the whole running order is the screen. Current Piece is expanded inline
  // with its player; empty Pieces show as dashed rows; options are two switches pinned at the top.
  import { fmt, type Performance } from '../data';
  import KindChip from '../KindChip.svelte';
  import Options from '../Options.svelte';
  import ScoreMock from '../ScoreMock.svelte';
  import Scrubber from '../Scrubber.svelte';
  import { currentItem, emptyPaused, go, jumpTo, options, player, queueOf, session, skipBy, toggle } from '../player.svelte';
  let { perf }: { perf: Performance } = $props();
  const q = $derived(queueOf(perf));
  const cur = $derived(currentItem());
  const hidden = $derived(perf.pieceIds.length - q.length);
</script>

<div class="screen">
  <div class="top pad">
    <a href="/" class="small muted">‹ Home</a>
    <h1>{perf.title}</h1>
    <Options />
    {#if options.skipEmpty && hidden > 0}<p class="small muted">{hidden} Piece hidden (no Practice Tracks)</p>{/if}
  </div>

  {#if session.done}<p class="pad"><b>Finished the Performance.</b></p>{/if}

  <ol class="set">
    {#each q as item, i}
      {@const here = !session.done && item.piece.id === cur?.piece.id}
      <li class="slot" class:here class:empty={!item.track}>
        <button class="head row" onclick={() => jumpTo(item.piece.id)}>
          <span class="n">{here && player.playing ? '▶' : i + 1}</span>
          <span class="grow"><b>{item.piece.title}</b>{#if !item.track}<br /><small class="warn">no Practice Track yet</small>{/if}</span>
          {#if item.track}<KindChip track={item.track} />{/if}
        </button>
        {#if here && item.track}
          <div class="open"><Scrubber track={item.track} />
            <div class="row"><span class="small muted grow">{fmt(item.track.durationSec)}</span>
              <button class="icon-btn" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}>↺</button>
              <button class="icon-btn" aria-label={player.playing ? 'Pause' : 'Play'} onclick={toggle}>{player.playing ? '❚❚' : '▶'}</button>
            </div>
            <ScoreMock piece={item.piece} height={150} />
          </div>
        {:else if here && emptyPaused()}
          <div class="open"><p class="small"><b>⏸ Paused.</b> Nothing to play for this Piece.</p><button class="btn" onclick={() => go(1)}>Continue</button></div>
        {/if}
      </li>
    {/each}
  </ol>

  <div class="foot row">
    <button class="icon-btn" aria-label="Previous Piece" onclick={() => go(-1)}>⏮</button>
    <span class="grow small muted" style="text-align:center">{cur ? cur.piece.title : ''}</span>
    <button class="icon-btn" aria-label="Next Piece" onclick={() => go(1)}>⏭</button>
  </div>
</div>

<style>
  h1 { font-size: 22px; margin-bottom: 6px; }
  .top { background: var(--surface); border-bottom: 1px solid var(--line); }
  .set { list-style: none; margin: 0; padding: 8px 12px; flex: 1; }
  .slot { border-radius: 12px; border: 1px solid var(--line); background: var(--surface); margin-bottom: 8px; overflow: hidden; }
  .slot.here { border: 2px solid var(--accent); }
  .slot.empty { border-style: dashed; background: none; }
  .head { width: 100%; padding: 8px 12px; min-height: 56px; text-align: left; }
  .n { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: 13px; font-weight: 700; flex: none; }
  .warn { color: var(--warn); font-weight: 400; }
  .open { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 8px; }
  .foot { position: sticky; bottom: 0; background: var(--surface); border-top: 1px solid var(--line); padding: 8px 14px 62px; }
</style>
