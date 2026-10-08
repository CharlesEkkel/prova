<script lang="ts">
  import { enhance } from '$app/forms';
  import { AlertDialog } from 'bits-ui';
  import { Pencil, Plus, Trash } from '@lucide/svelte';
  import AlertMessage from '../../../../lib/components/AlertMessage.svelte';
  import RoleSummary from '../../../../lib/components/RoleSummary.svelte';
  import { createDialogState } from '../../../../lib/components/dialog-state.svelte';
  import Btn from '../../../../lib/components/ui/Btn.svelte';
  import CheckRow from '../../../../lib/components/ui/CheckRow.svelte';
  import ManageMenu from '../../../../lib/components/ui/ManageMenu.svelte';
  import Modal from '../../../../lib/components/ui/Modal.svelte';
  import { input, fieldLabel, hint } from '../../../../lib/components/ui/styles';
  import {
    canChangeRole,
    hasNoRead,
    permissionBlockedReason,
  } from '../../../../lib/core/admin-rules';
  import {
    permissionDescriptions,
    permissionLabels,
    rolePermissions,
    type Permission,
  } from '../../../../lib/core/permissions';
  import type { RoleRow } from '../../../../lib/shell/admin';
  import { closeOnSuccess } from '../../../../lib/shell/enhance';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  const held = $derived(data.permissions);

  type Dialog =
    { readonly kind: 'new' } | { readonly kind: 'edit' | 'delete'; readonly role: RoleRow };
  const dialog = createDialogState<Dialog>();
  const current = $derived(dialog.current);
  const closeIfDone = closeOnSuccess(dialog.close);

  let selected = $state<readonly Permission[]>([]);

  const openDialog = (next: Dialog) => {
    selected = next.kind === 'edit' ? next.role.permissions : [];
    dialog.open(next);
  };

  const toggle = (permission: Permission, on: boolean) => {
    selected = on ? [...selected, permission] : selected.filter((p) => p !== permission);
  };

  const singers = (count: number) => (count === 1 ? '1 Singer' : `${count.toString()} Singers`);

  const actionsOf = (role: RoleRow) => [
    {
      key: 'edit',
      label: 'Edit Role…',
      icon: Pencil,
      disabled: !canChangeRole(held, role),
      run: () => {
        openDialog({ kind: 'edit', role });
      },
    },
    {
      key: 'delete',
      label: 'Delete Role…',
      icon: Trash,
      danger: true,
      disabled: !canChangeRole(held, role),
      run: () => {
        openDialog({ kind: 'delete', role });
      },
    },
  ];

  const card = 'rounded-2xl border bg-white dark:bg-zinc-900';
</script>

{#if form?.problem !== undefined}
  <div class="mb-4"><AlertMessage>{form.problem}</AlertMessage></div>
{/if}

<div class="flex flex-col gap-4">
  <div class="flex items-start justify-between gap-3">
    <p class="max-w-prose text-sm text-zinc-500">
      A Role is a named bundle of Permissions. Give a Singer several to combine them. Admin and
      Owner are built in and locked.
    </p>
    <Btn
      size="sm"
      variant="soft"
      onclick={() => {
        openDialog({ kind: 'new' });
      }}><Plus class="size-4" /> New Role</Btn
    >
  </div>

  <ul class="flex flex-col gap-2">
    {#each data.roles as role (role.id)}
      <li data-testid="role">
        {#if role.isBuiltin}
          <div class={card}><RoleSummary {role} {held} /></div>
        {:else}
          <div class="{card} pr-1">
            <ManageMenu actions={actionsOf(role)} label="Actions for {role.name} Role">
              <RoleSummary {role} {held} />
            </ManageMenu>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<Modal
  open={current?.kind === 'new' || current?.kind === 'edit'}
  onClose={dialog.close}
  title={current?.kind === 'edit' ? `Edit ${current.role.name}` : 'New Role'}
  description="Pick the Permissions this Role grants."
>
  {#if current?.kind === 'new' || current?.kind === 'edit'}
    <form
      id="role-form"
      method="POST"
      action={current.kind === 'new' ? '?/create' : '?/update'}
      use:enhance={closeIfDone}
      class="flex flex-col gap-5"
    >
      {#if current.kind === 'edit'}
        <input type="hidden" name="role" value={current.role.id} />
      {/if}
      <div>
        <label for="role-name" class={fieldLabel}>Name</label>
        <input
          id="role-name"
          name="name"
          required
          class={input}
          value={current.kind === 'edit' ? current.role.name : ''}
        />
      </div>
      <fieldset>
        <legend class={fieldLabel}>Permissions (at least one)</legend>
        <div class="flex flex-col gap-1">
          {#each rolePermissions as permission (permission)}
            {@const reason = permissionBlockedReason(held, permission)}
            <CheckRow
              id="permission-{permission}"
              name="permission"
              value={permission}
              checked={selected.includes(permission)}
              disabled={reason !== null}
              onChange={(on: boolean) => {
                toggle(permission, on);
              }}
              title={permissionLabels[permission]}
              detail={reason ?? permissionDescriptions[permission]}
            />
          {/each}
        </div>
        {#if selected.length > 0 && hasNoRead(selected)}
          <p class={hint}>Without Read, Singers with only this Role stay Pending.</p>
        {/if}
      </fieldset>
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={dialog.close}>Cancel</Btn>
    <Btn type="submit" form="role-form" disabled={selected.length === 0}>
      {current?.kind === 'edit' ? 'Save Role' : 'Create Role'}
    </Btn>
  {/snippet}
</Modal>

<Modal
  alert
  open={current?.kind === 'delete'}
  onClose={dialog.close}
  title={current?.kind === 'delete' ? `Delete the ${current.role.name} Role?` : ''}
  description={current?.kind === 'delete'
    ? `${singers(current.role.singerCount)} will lose this Role. Permissions from their other Roles are kept. This cannot be undone.`
    : ''}
>
  {#if current?.kind === 'delete'}
    <form id="delete-form" method="POST" action="?/delete" use:enhance={closeIfDone}>
      <input type="hidden" name="role" value={current.role.id} />
    </form>
  {/if}
  {#snippet footer()}
    <AlertDialog.Cancel>
      {#snippet child({ props })}
        <Btn variant="ghost" {...props}>Cancel</Btn>
      {/snippet}
    </AlertDialog.Cancel>
    <Btn variant="danger" type="submit" form="delete-form">Delete Role</Btn>
  {/snippet}
</Modal>
