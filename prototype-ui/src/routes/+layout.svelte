<script lang="ts">
  import '../app.css';
  import { Dialog } from 'bits-ui';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import Menu from '@lucide/svelte/icons/menu';
  import Search from '@lucide/svelte/icons/search';
  import Music from '@lucide/svelte/icons/music';
  import X from '@lucide/svelte/icons/x';
  import NowPlaying from '$lib/shell/NowPlaying.svelte';
  import SearchDialog from '$lib/shell/SearchDialog.svelte';
  import Sidebar from '$lib/shell/Sidebar.svelte';
  import Btn from '$lib/ui/Btn.svelte';
  import { player } from '$lib/player.svelte';
  import { ui } from '$lib/ui.svelte';
  let { children } = $props();
  afterNavigate(() => (ui.menu = false));
  // the play-through screens carry their own transport, so the global bar steps aside there
  const showBar = $derived(player.track !== null && !page.url.pathname.startsWith('/perform'));
</script>

<div class="flex h-dvh">
  <aside class="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-100/60 lg:block dark:border-zinc-800 dark:bg-zinc-900/40"><Sidebar /></aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <header class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 lg:hidden dark:border-zinc-800">
      <Btn variant="ghost" size="icon" aria-label="Open menu" onclick={() => (ui.menu = true)}><Menu class="size-5" /></Btn>
      <div class="flex flex-1 items-center gap-2"><div class="grid size-7 place-items-center rounded-lg bg-violet-600 text-white"><Music class="size-4" /></div><span class="font-semibold tracking-tight">Prova</span></div>
      <Btn variant="ghost" size="icon" aria-label="Search" onclick={() => (ui.search = true)}><Search class="size-5" /></Btn>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto pb-20">{@render children()}</main>
    {#if showBar && player.track}<NowPlaying track={player.track} />{/if}
  </div>
</div>

<Dialog.Root bind:open={ui.menu}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 lg:hidden" />
    <Dialog.Content class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-zinc-50 shadow-2xl lg:hidden dark:bg-zinc-950">
      <Dialog.Title class="sr-only">Menu</Dialog.Title>
      <Dialog.Description class="sr-only">Navigate Prova</Dialog.Description>
      <Dialog.Close class="absolute top-3 right-3 grid size-10 place-items-center rounded-full hover:bg-zinc-200/70 dark:hover:bg-zinc-800" aria-label="Close menu"><X class="size-5" /></Dialog.Close>
      <Sidebar />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<SearchDialog />
