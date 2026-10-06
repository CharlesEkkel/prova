<script lang="ts">
  // Variant A "Stacked": performance cards on top, repertoire list below, past tucked away.
  import { PIECES, SINGER, daysUntil, fmtDate, past, upcoming, piece } from '../data';
  let showPast = $state(false);
</script>

<div class="screen">
  <header class="pad">
    <p class="muted small">Hi {SINGER.name}</p>
    <h1>Prova</h1>
    <p class="small">Your Voice Part: <b>{SINGER.part}</b></p>
  </header>

  <section class="pad">
    <h2 class="h-label">Upcoming Performances</h2>
    <div class="stack">
      {#each upcoming() as perf}
        <a href="/perform/{perf.id}" class="card perf">
          <div class="grow">
            <h3>{perf.title}</h3>
            <p class="small muted">{fmtDate(perf.date)} · {perf.venue}</p>
            <p class="small">{perf.pieceIds.length} Pieces · {perf.pieceIds.filter((id) => piece(id).tracks.length === 0).length} without Practice Tracks</p>
          </div>
          <div class="days"><b>{daysUntil(perf.date)}</b><span>days</span></div>
        </a>
      {/each}
    </div>
    <button class="link" onclick={() => (showPast = !showPast)}>{showPast ? 'Hide' : 'Show'} past Performances</button>
    {#if showPast}
      <div class="stack">
        {#each past() as perf}
          <a href="/perform/{perf.id}" class="card perf archived">
            <div class="grow"><h3>{perf.title}</h3><p class="small muted">{fmtDate(perf.date)} · archived</p></div>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section class="pad">
    <h2 class="h-label">Repertoire ({PIECES.length} Pieces)</h2>
    <ul class="list card">
      {#each PIECES as p}
        <li>
          <a href="/piece/{p.id}" class="row item">
            <div class="grow"><b>{p.title}</b><p class="small muted">{p.composer}</p></div>
            {#if p.tracks.length === 0}<span class="tag warn">no tracks</span>{:else}<span class="tag">{p.tracks.length} tracks</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  h1 { font-size: 28px; }
  .stack { display: flex; flex-direction: column; gap: 10px; margin: 10px 0; }
  .perf { display: flex; gap: 12px; padding: 14px; align-items: center; min-height: 72px; }
  .archived { opacity: .7; }
  .days { text-align: center; background: var(--accent-soft); color: var(--accent); border-radius: 10px; padding: 6px 12px; display: grid; }
  .days b { font-size: 22px; }
  .days span { font-size: 11px; }
  .link { color: var(--accent); font-weight: 600; min-height: 44px; }
  .list { list-style: none; margin: 10px 0 0; padding: 0; }
  .item { padding: 12px 14px; min-height: 56px; border-bottom: 1px solid var(--line); }
  li:last-child .item { border: 0; }
  .tag { font-size: 12px; background: var(--accent-soft); color: var(--accent); padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
  .tag.warn { background: #fde9d6; color: var(--warn); }
</style>
