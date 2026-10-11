<script lang="ts">
  // One action list, two ways in: right-click or long-press the thing (ContextMenu), or the visible
  // ⋯ button (DropdownMenu), which keeps it discoverable and usable on touch. An action can be shown
  // but disabled, so a Singer sees what exists and what they may not do. With no actions at all it
  // shows only its content.
  import { ContextMenu, DropdownMenu } from 'bits-ui';
  import { Ellipsis } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import ManageItems from './ManageItems.svelte';
  import { menuPanel } from './styles';
  import type { ManageAction } from './manage-action';

  const {
    actions,
    label,
    align = 'center',
    overlay = 'none',
    children,
  }: {
    readonly actions: readonly ManageAction[];
    readonly label: string;
    /** Where the ⋯ button sits beside tall content: centred, or level with its first line (a 2rem heading). */
    readonly align?: 'center' | 'first-line';
    /**
     * Lay the ⋯ button over the content's top-right corner instead of beside it, so a wide tile keeps
     * its width on a phone; `on-primary` lightens it for content on the primary colour.
     */
    readonly overlay?: 'none' | 'plain' | 'on-primary';
    readonly children: Snippet;
  } = $props();

  const placement = $derived(
    overlay === 'none' ? (align === 'first-line' ? '-mt-1.5' : '') : 'absolute top-2 right-2',
  );
  const tone = $derived(
    overlay === 'on-primary'
      ? 'text-primary-100 hover:bg-white/15'
      : 'text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800',
  );
</script>

{#if actions.length === 0}
  <!-- Nothing this Singer may do: just the content, with no empty menu. -->
  {@render children()}
{:else}
  <div
    class="{overlay === 'none' ? 'flex gap-1' : 'relative'} {align === 'first-line'
      ? 'items-start'
      : 'items-center'}"
  >
    <ContextMenu.Root>
      <ContextMenu.Trigger class="block min-w-0 flex-1">{@render children()}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content class="z-[70] min-w-52 {menuPanel}"
          ><ManageItems {actions} kind="context" /></ContextMenu.Content
        >
      </ContextMenu.Portal>
    </ContextMenu.Root>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={label}
        class="grid size-11 shrink-0 place-items-center rounded-full transition {tone} {placement}"
      >
        <Ellipsis class="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} class="z-[70] min-w-52 {menuPanel}">
          <ManageItems {actions} kind="dropdown" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  </div>
{/if}
