<script lang="ts">
  import { enhance } from '$app/forms';
  import AlertMessage from '../../../lib/components/AlertMessage.svelte';
  import { createDialogState } from '../../../lib/components/dialog-state.svelte';
  import DialogActions from '../../../lib/components/DialogActions.svelte';
  import Modal from '../../../lib/components/Modal.svelte';
  import NoReadWarning from '../../../lib/components/NoReadWarning.svelte';
  import { canChangeRole, hasNoRead, permissionBlockedReason } from '../../../lib/core/admin-rules';
  import {
    permissionDescriptions,
    rolePermissions,
    type Permission,
  } from '../../../lib/core/permissions';
  import type { RoleRow } from '../../../lib/shell/admin';
  import { closeOnSuccess } from '../../../lib/shell/enhance';
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

  const titleOf = (dialogNow: Dialog) =>
    dialogNow.kind === 'new'
      ? 'New Role'
      : dialogNow.kind === 'edit'
        ? `Edit ${dialogNow.role.name}`
        : `Delete ${dialogNow.role.name}?`;
</script>

{#if form?.problem !== undefined}
  <AlertMessage>{form.problem}</AlertMessage>
{/if}

<div class="flex items-center justify-between">
  <h2 class="text-lg font-semibold">Roles</h2>
  <button
    class="min-h-11 rounded bg-emerald-700 px-4 font-medium text-white"
    onclick={() => {
      openDialog({ kind: 'new' });
    }}>New Role</button
  >
</div>

<ul class="flex flex-col gap-3">
  {#each data.roles as role (role.id)}
    <li class="flex flex-col gap-3 rounded border p-3" data-testid="role">
      <div class="flex items-center justify-between gap-2">
        <p class="font-medium">
          {role.name}
          {#if role.isBuiltin}<span class="text-sm opacity-70">(built in, locked)</span>{/if}
        </p>
        <p class="text-sm opacity-70">{singers(role.singerCount)}</p>
      </div>
      <ul class="flex flex-wrap gap-1" aria-label="Permissions">
        {#each role.permissions as permission (permission)}
          <li class="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-900">{permission}</li>
        {/each}
      </ul>
      {#if hasNoRead(role.permissions)}
        <NoReadWarning />
      {/if}
      {#if !role.isBuiltin}
        <div class="flex gap-2">
          <button
            class="min-h-11 rounded border px-4 disabled:opacity-60"
            disabled={!canChangeRole(held, role)}
            onclick={() => {
              openDialog({ kind: 'edit', role });
            }}>Edit</button
          >
          <button
            class="min-h-11 rounded border px-4 disabled:opacity-60"
            disabled={!canChangeRole(held, role)}
            onclick={() => {
              openDialog({ kind: 'delete', role });
            }}>Delete</button
          >
        </div>
        {#if !canChangeRole(held, role)}
          <p class="text-sm opacity-70">
            Only an Owner can change a Role that includes manage-users.
          </p>
        {/if}
      {/if}
    </li>
  {/each}
</ul>

<Modal
  open={current !== null}
  onClose={dialog.close}
  title={current === null ? '' : titleOf(current)}
  description={current?.kind === 'delete'
    ? `${singers(current.role.singerCount)} will lose this Role. This cannot be undone.`
    : undefined}
>
  {#if current?.kind === 'delete'}
    <form method="POST" action="?/delete" use:enhance={closeIfDone} class="flex flex-col gap-3">
      <input type="hidden" name="role" value={current.role.id} />
      <DialogActions label="Delete Role" tone="danger" onCancel={dialog.close} />
    </form>
  {:else if current !== null}
    <form
      method="POST"
      action={current.kind === 'new' ? '?/create' : '?/update'}
      use:enhance={closeIfDone}
      class="flex flex-col gap-3"
    >
      {#if current.kind === 'edit'}
        <input type="hidden" name="role" value={current.role.id} />
      {/if}
      <label class="flex flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          required
          value={current.kind === 'edit' ? current.role.name : ''}
          class="min-h-11 rounded border bg-transparent px-2"
        />
      </label>
      <fieldset class="flex flex-col gap-2">
        <legend class="text-sm">Permissions (at least one)</legend>
        {#each rolePermissions as permission (permission)}
          {@const reason = permissionBlockedReason(held, permission)}
          <label class="flex items-start gap-2">
            <input
              type="checkbox"
              name="permission"
              value={permission}
              class="mt-1"
              checked={selected.includes(permission)}
              disabled={reason !== null}
              onchange={(event) => {
                toggle(permission, event.currentTarget.checked);
              }}
            />
            <span>
              {permission}
              <span class="block text-xs opacity-70">{permissionDescriptions[permission]}</span>
              {#if reason !== null}<span class="block text-xs opacity-70">{reason}</span>{/if}
            </span>
          </label>
        {/each}
      </fieldset>
      {#if hasNoRead(selected)}
        <NoReadWarning />
      {/if}
      <DialogActions label="Save Role" disabled={selected.length === 0} onCancel={dialog.close} />
    </form>
  {/if}
</Modal>
