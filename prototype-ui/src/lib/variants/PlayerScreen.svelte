<script lang="ts">
  // The one player screen. A Performance play-through shows it with a running order beside it; a single
  // Piece shows the same screen without the running order and with a Start button. The score is a
  // collapsed panel; fullscreen (ScoreViewer) only opens when the Singer asks, at the remembered page.
  import { Collapsible, Popover, ToggleGroup } from 'bits-ui';
  import Settings from '@lucide/svelte/icons/settings-2';
  import Play from '@lucide/svelte/icons/play';
  import Maximize from '@lucide/svelte/icons/maximize';
  import FileText from '@lucide/svelte/icons/file-text';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { fmt, kindLabel, type Performance } from '../data.svelte';
  import { currentItem, emptyPaused, pageOf, queueOf, score, scoreOf, session, startPiece, startPlaythrough } from '../player.svelte';
  import Btn from '../ui/Btn.svelte';
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
          <div>
            <p class={label}>{perf ? `Piece ${idx + 1} of ${q.length}` : 'Piece'}</p>
            <h2 class="mt-1 text-3xl font-semibold tracking-tight lg:text-4xl">{cur.piece.title}</h2>
            <p class="text-zinc-500">{cur.piece.composer}</p>
          </div>

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
            {#if sc}
              {#if cur.piece.scores.length > 1}
                <ToggleGroup.Root type="single" value={sc.id} onValueChange={(v) => v && (score.selected[cur.piece.id] = v)} aria-label="Which Score" class="flex gap-1 overflow-x-auto">
                  {#each cur.piece.scores as s (s.id)}
                    <ToggleGroup.Item value={s.id} class="min-h-9 rounded-full px-3 text-xs font-medium whitespace-nowrap text-zinc-600 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:text-zinc-400 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900">{s.label}</ToggleGroup.Item>
                  {/each}
                </ToggleGroup.Root>
              {/if}
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
