<script lang="ts">
  // Variant C "Score-first": the choir score fills the screen (singing along while reading), with
  // a thin progress strip of dots on top and one compact control bar. Options in a popover.
  import { kindLabel, type Performance } from '../data';
  import Options from '../Options.svelte';
  import ScoreMock from '../ScoreMock.svelte';
  import Scrubber from '../Scrubber.svelte';
  import { currentItem, emptyPaused, go, player, queueOf, session, toggle } from '../player.svelte';
  let { perf }: { perf: Performance } = $props();
  let pop = $state(false);
  const q = $derived(queueOf(perf));
  const cur = $derived(currentItem());
  const idx = $derived(q.findIndex((x) => x.piece.id === cur?.piece.id));
  const nextItem = $derived(q[idx + 1]);
</script>

<div class="screen">
  <div class="dots" aria-label="Progress: piece {idx + 1} of {q.length}">
    {#each q as _, i}<span class:done={i < idx} class:now={i === idx}></span>{/each}
  </div>

  {#if session.done}
    <div class="pad"><h2>Performance finished 🎶</h2></div>
  {:else if cur}
    <div class="pad titlebar row">
      <div class="grow"><h1>{cur.piece.title}</h1><p class="small muted">{idx + 1}/{q.length} · {cur.track ? kindLabel(cur.track) : 'no Practice Track'}</p></div>
      <button class="icon-btn" aria-label="Options" onclick={() => (pop = !pop)}>⚙</button>
    </div>
    <div class="pad scorewrap"><ScoreMock piece={cur.piece} height={420} /></div>

    {#if emptyPaused()}
      <div class="pause"><b>⏸ Paused: no Practice Tracks for this Piece.</b> <button class="btn" onclick={() => go(1)}>Continue</button></div>
    {/if}
  {/if}

  {#if pop}<div class="pop card pad"><Options /></div>{/if}

  <div class="bar">
    {#if cur?.track && !emptyPaused()}<Scrubber track={cur.track} />{/if}
    <div class="row">
      <button class="icon-btn" aria-label="Previous Piece" onclick={() => go(-1)}>⏮</button>
      <button class="icon-btn big small-big" aria-label={player.playing ? 'Pause' : 'Play'} onclick={toggle} disabled={!cur?.track}>{player.playing ? '❚❚' : '▶'}</button>
      <button class="icon-btn" aria-label="Next Piece" onclick={() => go(1)}>⏭</button>
      <div class="grow next small"><span class="muted">Next</span><br /><b>{nextItem ? nextItem.piece.title : 'End'}</b></div>
    </div>
  </div>
</div>

<style>
  h1 { font-size: 20px; }
  .dots { display: flex; gap: 4px; padding: 10px 16px 0; flex: none; }
  .dots span { flex: 1; height: 5px; border-radius: 3px; background: var(--line); }
  .dots .done { background: var(--accent); opacity: .5; }
  .dots .now { background: var(--accent); }
  .titlebar { padding-bottom: 8px; }
  .scorewrap { flex: 1; padding-top: 0; }
  .pause { margin: 0 16px; padding: 12px; border-radius: 12px; border: 2px dashed var(--warn); display: flex; flex-direction: column; gap: 8px; }
  .pop { position: absolute; right: 12px; top: 120px; z-index: 20; width: 300px; box-shadow: 0 8px 30px #0004; }
  .bar { position: sticky; bottom: 0; margin-top: auto; background: var(--surface); border-top: 1px solid var(--line); padding: 8px 14px 62px; }
  .small-big { width: 60px; height: 60px; font-size: 24px; }
  .next { line-height: 1.2; padding-left: 8px; }
</style>
