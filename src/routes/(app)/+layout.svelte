<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { Menu, X } from '@lucide/svelte';
  import { afterNavigate } from '$app/navigation';
  import { displayMode } from '../../lib/components/display-mode.svelte';
  import Btn from '../../lib/components/ui/Btn.svelte';
  import Logo from '../../lib/components/ui/Logo.svelte';
  import DisplayModeToggle from '../../lib/components/shell/DisplayModeToggle.svelte';
  import SidebarNav from '../../lib/components/shell/SidebarNav.svelte';
  import type { LayoutData } from './$types';

  const { data, children }: { readonly data: LayoutData; readonly children: Snippet } = $props();

  let drawerOpen = $state(false);
  let width = $state(0);

  // The drawer only exists below `lg`; growing past it must not leave a hidden overlay behind.
  $effect(() => {
    if (width >= 1024) drawerOpen = false;
  });

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

<svelte:window bind:innerWidth={width} />

<div class="flex h-dvh">
  <aside class="hidden w-64 shrink-0 border-r bg-zinc-100/60 lg:block dark:bg-zinc-900/40">
    <SidebarNav shell={data} />
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <!-- The Major Performance banner goes here, across the top of every screen (#32). -->
    <div id="major-performance-banner"></div>

    <header class="flex items-center gap-2 border-b px-3 py-2 lg:hidden">
      <Btn
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onclick={() => {
          drawerOpen = true;
        }}><Menu size={20} /></Btn
      >
      <div class="flex flex-1 items-center gap-2">
        <Logo size="sm" />
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
      class="fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-zinc-50 text-zinc-900 shadow-2xl lg:hidden dark:bg-zinc-950 dark:text-zinc-100"
    >
      <Dialog.Title class="sr-only">Menu</Dialog.Title>
      <Dialog.Description class="sr-only">Navigate Prova</Dialog.Description>
      <Dialog.Close aria-label="Close menu" class="absolute top-3 right-3">
        {#snippet child({ props })}
          <Btn variant="ghost" size="icon" {...props}><X size={20} /></Btn>
        {/snippet}
      </Dialog.Close>
      <SidebarNav shell={data} />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
