<script lang="ts">
  // The entries of a ManageMenu, drawn for either way in (right-click or the ⋯ button).
  import { ContextMenu, DropdownMenu } from 'bits-ui';
  import type { ManageAction } from './manage-action';

  const {
    actions,
    kind,
  }: { readonly actions: readonly ManageAction[]; readonly kind: 'context' | 'dropdown' } =
    $props();

  const itemClass =
    'flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm outline-none data-disabled:opacity-40 data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800';
  const toneOf = (action: ManageAction) =>
    action.danger === true ? 'text-red-600 dark:text-red-400' : '';
</script>

{#each actions as action (action.key)}
  {#if kind === 'context'}
    <ContextMenu.Item
      onSelect={action.run}
      disabled={action.disabled ?? false}
      class="{itemClass} {toneOf(action)}"
    >
      <action.icon class="size-4" />{action.label}
    </ContextMenu.Item>
  {:else}
    <DropdownMenu.Item
      onSelect={action.run}
      disabled={action.disabled ?? false}
      class="{itemClass} {toneOf(action)}"
    >
      <action.icon class="size-4" />{action.label}
    </DropdownMenu.Item>
  {/if}
{/each}
