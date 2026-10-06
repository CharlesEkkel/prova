<script lang="ts">
  // Variant B "Timeline": a vertical rail through time. Past above Today (collapsed), Performances
  // as nodes with their Pieces listed inline. Repertoire is a searchable list at the bottom.
  import { PERFORMANCES, PIECES, TODAY, fmtDate, piece, past, upcoming } from '../data';
  let query = $state('');
  let showPast = $state(false);
  const matches = $derived(PIECES.filter((p) => (p.title + p.composer).toLowerCase().includes(query.toLowerCase())));
  void PERFORMANCES;
</script>

<div class="screen pad">
  <h1>Timeline</h1>
  <ol class="rail">
    <li class="past-toggle"><button onclick={() => (showPast = !showPast)}>{showPast ? '▾' : '▸'} {past().length} past Performance</button></li>
    {#if showPast}
      {#each past() as perf}
        <li class="node archived">
          <p class="date">{fmtDate(perf.date)}</p>
          <a href="/perform/{perf.id}"><h3>{perf.title}</h3></a>
        </li>
      {/each}
    {/if}
    <li class="today"><span>Today · {fmtDate(TODAY)}</span></li>
    {#each upcoming() as perf}
      <li class="node">
        <p class="date">{fmtDate(perf.date)} · {perf.venue}</p>
        <a href="/perform/{perf.id}" class="card head"><h3>{perf.title}</h3><span class="btn small">▶ Play through</span></a>
        <ul class="pieces">
          {#each perf.pieceIds as id, i}
            <li><a href="/piece/{id}"><span class="muted">{i + 1}.</span> {piece(id).title}{#if piece(id).tracks.length === 0}<em> · no tracks yet</em>{/if}</a></li>
          {/each}
        </ul>
      </li>
    {/each}
  </ol>

  <h2 class="h-label">Repertoire</h2>
  <input class="search" type="search" placeholder="Search Pieces or composers" bind:value={query} />
  <ul class="plain">
    {#each matches as p}
      <li><a href="/piece/{p.id}" class="row"><b class="grow">{p.title}</b><span class="small muted">{p.composer}</span></a></li>
    {:else}
      <li class="muted">No Pieces match.</li>
    {/each}
  </ul>
</div>

<style>
  h1 { font-size: 24px; margin-bottom: 8px; }
  .rail { list-style: none; margin: 0 0 24px; padding: 0 0 0 22px; border-left: 3px solid var(--accent); }
  .node { position: relative; padding: 8px 0 18px; }
  .node::before { content: ''; position: absolute; left: -31px; top: 12px; width: 15px; height: 15px; border-radius: 50%; background: var(--accent); border: 3px solid var(--bg); }
  .archived { opacity: .55; }
  .past-toggle button { color: var(--muted); min-height: 44px; font-size: 14px; }
  .today { margin: 4px 0 8px -22px; }
  .today span { background: #111; color: #ffcc00; font-size: 12px; font-weight: 800; padding: 3px 10px; border-radius: 99px; letter-spacing: .05em; }
  .date { font-size: 13px; color: var(--muted); margin-bottom: 4px; }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; gap: 8px; }
  .btn.small { min-height: 36px; font-size: 13px; padding: 0 12px; display: grid; place-items: center; }
  .pieces { list-style: none; margin: 6px 0 0; padding: 0; }
  .pieces a { display: block; padding: 8px 4px; min-height: 40px; }
  em { color: var(--warn); font-size: 13px; }
  .search { width: 100%; min-height: 48px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); margin: 8px 0; font: inherit; }
  .plain { list-style: none; padding: 0; margin: 0; }
  .plain a { padding: 12px 0; min-height: 48px; border-bottom: 1px solid var(--line); }
</style>
