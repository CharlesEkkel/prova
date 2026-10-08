<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { Menu, Music, X } from '@lucide/svelte';
  import { afterNavigate } from '$app/navigation';
  import { displayMode } from '../../lib/components/display-mode.svelte';
  import DisplayModeToggle from '../../lib/components/shell/DisplayModeToggle.svelte';
  import SidebarNav from '../../lib/components/shell/SidebarNav.svelte';
  import type { LayoutData } from './$types';

  const { data, children }: { readonly data: LayoutData; readonly children: Snippet } = $props();

  const navProps = $derived({
    singerName: data.singerName,
    voicePartName: data.voicePartName,
    showAdminLink: data.showAdminLink,
    performances: data.performances,
  });

  let drawerOpen = $state(false);

  // A followed link closes the drawer.
  afterNavigate(() => {
    drawerOpen = false;
  });

  onMount(() => {
    const stopped = displayMode.start();
    return () => {
      void stopped.then((stop) => {
        stop();
      });
    };
  });
</script>

<div class="flex h-dvh">
  <aside class="hidden w-64 shrink-0 border-r bg-slate-100/60 lg:block dark:bg-slate-900/40">
    <SidebarNav {...navProps} />
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <!-- The Major Performance banner goes here, across the top of every screen (#32). -->
    <div id="major-performance-banner"></div>

    <header class="flex items-center gap-2 border-b px-3 py-2 lg:hidden">
      <button
        class="grid size-11 place-items-center rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800"
        aria-label="Open menu"
        onclick={() => {
          drawerOpen = true;
        }}><Menu size={20} /></button
      >
      <div class="flex flex-1 items-center gap-2">
        <div class="grid size-7 place-items-center rounded-lg bg-primary-600 text-white">
          <Music size={16} aria-hidden="true" />
        </div>
        <span class="font-semibold tracking-tight">Prova</span>
      </div>
      <DisplayModeToggle compact />
      <!-- The Search button is added by #33. -->
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto">{@render children()}</main>
  </div>
</div>

<Dialog.Root bind:open={drawerOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/40 lg:hidden" />
    <Dialog.Content
      class="fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-slate-50 text-slate-900 shadow-2xl lg:hidden dark:bg-slate-950 dark:text-slate-100"
    >
      <Dialog.Title class="sr-only">Menu</Dialog.Title>
      <Dialog.Description class="sr-only">Navigate Prova</Dialog.Description>
      <Dialog.Close
        class="absolute top-3 right-3 grid size-11 place-items-center rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800"
        aria-label="Close menu"><X size={20} /></Dialog.Close
      >
      <SidebarNav {...navProps} />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
