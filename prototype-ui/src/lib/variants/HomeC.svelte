<script lang="ts">
  // Variant C "Hero + tabs": one big next-Performance hero with the primary action, then
  // thumb-reachable segmented tabs along the bottom edge: Upcoming | Repertoire | Past.
  import { PIECES, SINGER, daysUntil, fmtDate, past, piece, upcoming } from '../data';
  let tab = $state<'upcoming' | 'repertoire' | 'past'>('upcoming');
  const next = upcoming()[0];
  const letters = $derived([...new Set(PIECES.map((p) => p.title[0]))].toSorted());
</script>

<div class="screen">
  {#if next}
    <section class="hero">
      <p class="small">Next Performance · in {daysUntil(next.date)} days</p>
      <h1>{next.title}</h1>
      <p class="small">{fmtDate(next.date)} · {next.venue}</p>
      <a class="btn go" href="/perform/{next.id}">▶ Start play-through</a>
      <p class="small">Singing <b>{SINGER.part}</b> · {next.pieceIds.length} Pieces</p>
    </section>
  {/if}

  <div class="body pad">
    {#if tab === 'upcoming'}
      {#each upcoming() as perf}
        <a href="/perform/{perf.id}" class="card block">
          <h3>{perf.title}</h3><p class="small muted">{fmtDate(perf.date)} · {perf.venue}</p>
          <p class="small">{perf.pieceIds.map((id) => piece(id).title).join(' · ')}</p>
        </a>
      {/each}
    {:else if tab === 'repertoire'}
      {#each letters as l}
        <h2 class="h-label letter">{l}</h2>
        {#each PIECES.filter((p) => p.title[0] === l) as p}
          <a href="/piece/{p.id}" class="row item"><b class="grow">{p.title}</b><span class="muted">›</span></a>
        {/each}
      {/each}
    {:else}
      {#each past() as perf}
        <a href="/perform/{perf.id}" class="card block archived"><h3>{perf.title}</h3><p class="small muted">{fmtDate(perf.date)} · archived</p></a>
      {/each}
    {/if}
  </div>

  <div class="tabs" role="tablist">
    {#each ['upcoming', 'repertoire', 'past'] as const as t}
      <button role="tab" aria-selected={tab === t} class:on={tab === t} onclick={() => (tab = t)}>{t[0].toUpperCase() + t.slice(1)}</button>
    {/each}
  </div>
</div>

<style>
  .hero { background: var(--accent); color: #fff; padding: 28px 20px 24px; display: flex; flex-direction: column; gap: 8px; flex: none; }
  h1 { font-size: 30px; line-height: 1.1; }
  .go { background: #fff; color: var(--accent); display: grid; place-items: center; min-height: 56px; font-size: 18px; margin: 8px 0; }
  .body { flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .block { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
  .archived { opacity: .65; }
  .letter { margin-top: 8px; }
  .item { min-height: 52px; border-bottom: 1px solid var(--line); }
  .tabs { position: sticky; bottom: 0; display: flex; background: var(--surface); border-top: 1px solid var(--line); padding-bottom: 56px; }
  .tabs button { flex: 1; min-height: 52px; font-weight: 600; color: var(--muted); border-top: 3px solid transparent; }
  .tabs button.on { color: var(--accent); border-top-color: var(--accent); }
</style>
