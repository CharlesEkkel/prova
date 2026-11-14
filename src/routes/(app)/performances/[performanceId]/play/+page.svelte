<script lang="ts">
  // A stand-in for the Play-through player, which #24 builds here.
  import { ChevronLeft } from '@lucide/svelte';
  import type { PageData } from './$types';

  const { data }: { readonly data: PageData } = $props();
</script>

<svelte:head>
  <title>Play-through of {data.name} · Prova</title>
</svelte:head>

<div class="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
  <a
    href={data.overview}
    class="inline-flex min-h-11 items-center gap-1 self-start text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
  >
    <ChevronLeft class="size-4" aria-hidden="true" />
    Back
  </a>
  <h1 class="text-2xl font-semibold tracking-tight">Play-through of {data.name}</h1>
  <ul class="text-sm text-zinc-600 dark:text-zinc-400">
    <li>Skip Pieces with nothing to play: {data.options.skipEmpty ? 'on' : 'off'}</li>
    <li>Prefer my Voice Part: {data.options.preferVoicePart ? 'on' : 'off'}</li>
  </ul>
  {#if data.first === null}
    <p>Nothing to play.</p>
  {:else}
    <p>
      First: <b>{data.first.title}</b>
      <span class="text-zinc-500">· {data.first.heard}</span>
    </p>
  {/if}
</div>
