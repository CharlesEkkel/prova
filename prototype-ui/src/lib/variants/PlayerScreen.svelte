<script lang="ts">
  // The one player screen. A Performance play-through shows it with a running order beside it; a single
  // Piece shows the same screen without the running order and with a Start button. The score is a
  // collapsed panel; fullscreen (ScoreViewer) only opens when the Singer asks, at the remembered page.
  import { Collapsible, Popover } from 'bits-ui';
  import Settings from '@lucide/svelte/icons/settings-2';
  import Play from '@lucide/svelte/icons/play';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Check from '@lucide/svelte/icons/check';
  import Upload from '@lucide/svelte/icons/upload';
  import FileUp from '@lucide/svelte/icons/file-up';
  import AudioLines from '@lucide/svelte/icons/audio-lines';
  import FileText from '@lucide/svelte/icons/file-text';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { pieceActions, scoreActions, trackActions } from '../actions';
  import { can } from '../access.svelte';
  import { fmt, kindLabel, type Performance } from '../data.svelte';
  import { openManage } from '../manage.svelte';
  import { currentItem, emptyPaused, pageOf, queueOf, score, scoreOf, session, startPiece, startPlaythrough } from '../player.svelte';
  import Btn from '../ui/Btn.svelte';
  import KindBadge from '../ui/KindBadge.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import PartPicker from '../ui/PartPicker.svelte';
  import PauseCard from '../ui/PauseCard.svelte';
  import PdfPage from '../ui/PdfPage.svelte';
  import PlaythroughOptions from '../ui/PlaythroughOptions.svelte';
  import QueueList from '../ui/QueueList.svelte';
  import ScoreViewer from '../ui/ScoreViewer.svelte';
  import Scrubber from '../ui/Scrubber.svelte';
  import Transport from '../ui/Transport.svelte';
  let { perf = undefined }: { perf?: Performance } = $props();

  const cur = $derived(currentItem());
  const q = $derived(perf ? queueOf(perf) : []);
  const idx = $derived(q.findIndex((x) => x.piece.id === cur?.piece.id));
  const next = $derived(q[idx + 1]);
  const sc = $derived(cur ? scoreOf(cur.piece) : undefined);
  let numPages = $state(0);
  const page = $derived(sc ? pageOf(sc) : 1);
  function turn(d: number) {
    if (sc) score.pages[sc.id] = Math.min(numPages || page + d, Math.max(1, page + d));
  }
  const label = 'text-xs font-semibold tracking-wider text-zinc-500 uppercase';
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-10 lg:py-10">
  <div class="flex items-center justify-between gap-3">
    <div>
      <a href={perf ? '/' : '/repertoire'} class="text-sm text-zinc-500 hover:underline">‹ {perf ? 'Home' : 'Repertoire'}</a>
      {#if perf}<h1 class="text-xl font-semibold tracking-tight lg:text-2xl">{perf.title}</h1>{/if}
    </div>
    {#if perf}
      <Popover.Root>
        <Popover.Trigger><Btn variant="outline" size="sm" aria-label="Play-through options"><Settings class="size-4" /> Options</Btn></Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="end" sideOffset={8} class="z-50 w-80 max-w-[92vw] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 class="mb-1 font-semibold">Play-through options</h2>
            <PlaythroughOptions />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    {/if}
  </div>

  <div class="mt-6 grid gap-8 {perf ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : 'mx-auto max-w-3xl'}">
    <section class="flex flex-col gap-5">
      {#if session.done}
        <div class="rounded-3xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h2 class="text-2xl font-semibold">That's the whole Performance 🎶</h2>
          {#if perf}<Btn class="mt-4" onclick={() => startPlaythrough(perf.id)}>Play it again</Btn>{/if}
        </div>
      {:else if cur}
        <div class="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-5 lg:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <ManageMenu actions={pieceActions(cur.piece)} label="Piece actions">
            <p class={label}>{perf ? `Piece ${idx + 1} of ${q.length}` : 'Piece'}</p>
            <h2 class="mt-1 text-3xl font-semibold tracking-tight lg:text-4xl">{cur.piece.title}</h2>
            <p class="text-zinc-500">{cur.piece.composer || 'No composer'}</p>
          </ManageMenu>

          {#if emptyPaused()}
            <PauseCard title={cur.piece.title} />
          {:else if session.started && cur.track}
            <div><PartPicker piece={cur.piece} track={cur.track} /></div>
            <Scrubber track={cur.track} />
            <Transport queue={!!perf} />
          {:else if cur.track}
            <div><PartPicker piece={cur.piece} track={cur.track} /></div>
            <Btn onclick={startPiece} class="self-start"><Play class="size-5 fill-current" /> Start</Btn>
          {:else}
            <p class="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">No Practice Track for this Piece yet.</p>
          {/if}
        </div>

        <!-- Many Singers read their own physical music, so the score is a collapsed panel; fullscreen is opt-in. -->
        <Collapsible.Root class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <Collapsible.Trigger class="group flex min-h-14 w-full items-center gap-3 px-4 text-left">
            <FileText class="size-5 text-zinc-400" />
            <span class="flex-1 text-sm font-medium">Score{#if sc}<span class="ml-1.5 font-normal text-zinc-500">· {sc.label}</span>{/if}</span>
            <ChevronDown class="size-4 text-zinc-400 transition group-data-[state=open]:rotate-180" />
          </Collapsible.Trigger>
          <Collapsible.Content class="flex flex-col gap-3 px-4 pb-4">
            {#if cur.piece.scores.length}
              <ul class="flex flex-col gap-0.5">
                {#each cur.piece.scores as s (s.id)}
                  <li>
                    <ManageMenu actions={scoreActions(s, cur.piece.id)} label="Score actions">
                      <button onclick={() => (score.selected[cur.piece.id] = s.id)} aria-pressed={sc?.id === s.id} class="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 {sc?.id === s.id ? 'font-semibold' : ''}">
                        <span class="grid size-5 place-items-center">{#if sc?.id === s.id}<Check class="size-4 text-violet-600" />{/if}</span>
                        <span class="flex-1 truncate">{s.label}</span>
                        {#if s.choir}<span class="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">Choir score</span>{/if}
                      </button>
                    </ManageMenu>
                  </li>
                {/each}
              </ul>
            {/if}
            {#if sc}
              <div class="relative h-72 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 lg:h-[26rem] dark:border-zinc-800 dark:bg-zinc-950">
                <PdfPage src={sc.file} {page} bind:numPages class="absolute inset-0 p-2" />
              </div>
              <div class="flex items-center justify-between gap-3 text-sm">
                <div class="flex items-center gap-1">
                  <Btn variant="ghost" size="icon" aria-label="Previous page" disabled={page <= 1} onclick={() => turn(-1)}><ChevronLeft class="size-5" /></Btn>
                  <span class="tabular-nums">Page <b>{page}</b> / {numPages || '…'}</span>
                  <Btn variant="ghost" size="icon" aria-label="Next page" disabled={numPages > 0 && page >= numPages} onclick={() => turn(1)}><ChevronRight class="size-5" /></Btn>
                </div>
                <Btn variant="soft" size="sm" onclick={() => (score.open = true)}><Maximize class="size-4" /> Open full screen</Btn>
              </div>
            {:else}
              <p class="rounded-xl border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500 dark:border-zinc-700">No Score uploaded for this Piece yet.</p>
            {/if}
            {#if can('append')}<Btn variant="outline" size="sm" class="self-start" onclick={() => openManage({ kind: 'upload-score', pieceId: cur.piece.id })}><FileUp class="size-4" /> Upload Score</Btn>{/if}
          </Collapsible.Content>
        </Collapsible.Root>

        <Collapsible.Root class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <Collapsible.Trigger class="group flex min-h-14 w-full items-center gap-3 px-4 text-left">
            <AudioLines class="size-5 text-zinc-400" />
            <span class="flex-1 text-sm font-medium">Practice Tracks<span class="ml-1.5 font-normal text-zinc-500">· {cur.piece.tracks.length}</span></span>
            <ChevronDown class="size-4 text-zinc-400 transition group-data-[state=open]:rotate-180" />
          </Collapsible.Trigger>
          <Collapsible.Content class="flex flex-col gap-1 px-4 pb-4">
            {#each cur.piece.tracks as t (t.id)}
              <ManageMenu actions={trackActions(t, t.label ?? kindLabel(t))} label="Practice Track actions">
                <div class="flex min-h-12 items-center gap-3 px-2 text-sm">
                  <KindBadge track={t} /><span class="min-w-0 flex-1 truncate text-zinc-500">{t.label ?? ''}</span><span class="tabular-nums text-zinc-500">{fmt(t.durationSec)}</span>
                </div>
              </ManageMenu>
            {:else}
              <p class="px-2 py-2 text-sm text-zinc-500">No Practice Tracks yet.</p>
            {/each}
            {#if can('append')}<Btn variant="outline" size="sm" class="mt-2 self-start" onclick={() => openManage({ kind: 'upload-track', pieceId: cur.piece.id })}><Upload class="size-4" /> Upload Practice Track</Btn>{/if}
          </Collapsible.Content>
        </Collapsible.Root>

        {#if perf}
          <p class="text-sm text-zinc-500">Up next: <b class="text-zinc-900 dark:text-zinc-100">{next ? next.piece.title : 'end of the Performance'}</b>{#if next?.track}{' '}· {kindLabel(next.track)} · {fmt(next.track.durationSec)}{/if}</p>
        {/if}
      {/if}
    </section>

    {#if perf}
      <aside>
        <h2 class="mb-2 {label}">Running order</h2>
        <QueueList {perf} />
      </aside>
    {/if}
  </div>
</div>

<ScoreViewer queue={!!perf} />
