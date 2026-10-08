<script lang="ts">
  // One action list, two ways in: right-click or long-press the thing (ContextMenu), or the visible
  // ⋯ button (DropdownMenu), which keeps it discoverable and usable on touch. An action can be shown
  // but disabled, so a Singer sees what exists and what they may not do.
  import { ContextMenu, DropdownMenu } from 'bits-ui';
  import { Ellipsis } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import ManageItems from './ManageItems.svelte';
  import type { ManageAction } from './manage-action';

  const {
    actions,
    label,
    children,
  }: {
    readonly actions: readonly ManageAction[];
    readonly label: string;
    readonly children: Snippet;
  } = $props();

  const content = 'z-[70] min-w-52 rounded-xl border bg-white p-1 shadow-xl dark:bg-zinc-900';
</script>

<div class="flex items-center gap-1">
  <ContextMenu.Root>
    <ContextMenu.Trigger class="block min-w-0 flex-1">{@render children()}</ContextMenu.Trigger>
    <ContextMenu.Portal>
      <ContextMenu.Content class={content}
        ><ManageItems {actions} kind="context" /></ContextMenu.Content
      >
    </ContextMenu.Portal>
  </ContextMenu.Root>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      aria-label={label}
      class="grid size-11 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
    >
      <Ellipsis class="size-5" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="end" sideOffset={4} class={content}>
        <ManageItems {actions} kind="dropdown" />
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
</div>
