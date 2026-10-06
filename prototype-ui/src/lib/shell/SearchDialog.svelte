<script lang="ts">
  import { Command, Dialog } from 'bits-ui';
  import { goto } from '$app/navigation';
  import { PERFORMANCES, PIECES } from '../data';
  import { openOverview, ui } from '../ui.svelte';

  function open(href: string) {
    ui.search = false;
    goto(href);
  }
  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      ui.search = !ui.search;
    }
  }
  const item = 'flex min-h-11 items-center justify-between rounded-lg px-3 text-sm data-selected:bg-violet-100 dark:data-selected:bg-violet-500/15';
  const heading = 'px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase';
</script>

<svelte:window {onkeydown} />

<Dialog.Root bind:open={ui.search}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed top-[12%] left-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
      <Dialog.Title class="sr-only">Search</Dialog.Title>
      <Dialog.Description class="sr-only">Find a Piece or Performance</Dialog.Description>
      <Command.Root>
        <Command.Input placeholder="Search Pieces and Performances…" class="h-14 w-full border-b border-zinc-200 bg-transparent px-4 text-base outline-none dark:border-zinc-800" />
        <Command.List class="max-h-80 overflow-y-auto p-2">
          <Command.Viewport>
            <Command.Empty class="p-6 text-center text-sm text-zinc-500">Nothing matches.</Command.Empty>
            <Command.Group>
              <Command.GroupHeading class={heading}>Performances</Command.GroupHeading>
              <Command.GroupItems>
                {#each PERFORMANCES as p (p.id)}
                  <Command.Item value="{p.title} performance" onSelect={() => openOverview(p.id)} class={item}>{p.title}<span class="text-xs text-zinc-500">{p.venue}</span></Command.Item>
                {/each}
              </Command.GroupItems>
            </Command.Group>
            <Command.Group>
              <Command.GroupHeading class={heading}>Pieces</Command.GroupHeading>
              <Command.GroupItems>
                {#each PIECES as p (p.id)}
                  <Command.Item value="{p.title} {p.composer}" onSelect={() => open(`/piece/${p.id}`)} class={item}>{p.title}<span class="text-xs text-zinc-500">{p.composer}</span></Command.Item>
                {/each}
              </Command.GroupItems>
            </Command.Group>
          </Command.Viewport>
        </Command.List>
      </Command.Root>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
