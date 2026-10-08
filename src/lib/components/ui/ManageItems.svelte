<script lang="ts">
  // The entries of a ManageMenu, drawn for either way in (right-click or the ⋯ button).
  import { ContextMenu, DropdownMenu } from 'bits-ui';
  import type { ManageAction } from './manage-action';
  import { menuEntry } from './styles';

  const {
    actions,
    kind,
  }: { readonly actions: readonly ManageAction[]; readonly kind: 'context' | 'dropdown' } =
    $props();

  const Item = $derived(kind === 'context' ? ContextMenu.Item : DropdownMenu.Item);
</script>

{#each actions as action (action.key)}
  <Item
    onSelect={action.run}
    disabled={action.disabled ?? false}
    class="{menuEntry} {action.danger === true ? 'text-red-600 dark:text-red-400' : ''}"
  >
    <action.icon class="size-4" />{action.label}
  </Item>
{/each}
