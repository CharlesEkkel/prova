<script lang="ts">
  // One action list, two ways in: right-click / long-press the thing (ContextMenu), or the visible ⋯ button
  // (DropdownMenu), which keeps it discoverable and usable on touch. With no allowed actions it renders
  // the content alone, so Readers never see management UI.
  import { ContextMenu, DropdownMenu } from 'bits-ui';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import type { Snippet } from 'svelte';
  import type { Action } from '../actions';
  // button: 'inline' puts ⋯ beside the content (rows), 'overlay' floats it top-right (tiles), 'none' = context menu only
  let { actions, children, button = 'inline', dark = false, class: cls = '', label = 'More actions' }: { actions: Action[]; children: Snippet; button?: 'inline' | 'overlay' | 'none'; dark?: boolean; class?: string; label?: string } = $props();
  const content = 'z-[70] min-w-52 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900';
  const itemCls = 'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm outline-none data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800';
</script>

{#snippet items(Item: typeof ContextMenu.Item | typeof DropdownMenu.Item)}
  {#each actions as a (a.key)}
    <Item onSelect={a.run} class="{itemCls} {a.danger ? 'text-red-600 dark:text-red-400' : ''}"><a.icon class="size-4" />{a.label}</Item>
  {/each}
{/snippet}

{#if actions.length === 0}
  <div class={cls}>{@render children()}</div>
{:else}
  <div class="relative {button === 'inline' ? 'flex items-center gap-1' : ''} {cls}">
    <ContextMenu.Root>
      <ContextMenu.Trigger class="block {button === 'inline' ? 'min-w-0 flex-1' : ''}">{@render children()}</ContextMenu.Trigger>
      <ContextMenu.Portal><ContextMenu.Content class={content}>{@render items(ContextMenu.Item)}</ContextMenu.Content></ContextMenu.Portal>
    </ContextMenu.Root>
    {#if button !== 'none'}
      <div class={button === 'overlay' ? 'absolute top-2 right-2 z-10' : 'shrink-0'}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger aria-label={label} class="grid size-10 place-items-center rounded-full transition {dark ? 'text-white hover:bg-white/20' : 'text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'}"><Ellipsis class="size-5" /></DropdownMenu.Trigger>
          <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={4} class={content}>{@render items(DropdownMenu.Item)}</DropdownMenu.Content></DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    {/if}
  </div>
{/if}
