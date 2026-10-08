<script lang="ts">
  import { enhance } from '$app/forms';
  import AlertMessage from '../../../lib/components/AlertMessage.svelte';
  import Modal from '../../../lib/components/Modal.svelte';
  import {
    canChangeRole,
    canOfferPermission,
    hasNoRead,
    mayOpenAdmin,
  } from '../../../lib/core/admin-rules';
  import {
    permissionDescriptions,
    rolePermissions,
    type Permission,
  } from '../../../lib/core/permissions';
  import type { RoleRow } from '../../../lib/shell/admin';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  const held = $derived(data.permissions);
  const offered = $derived(
    rolePermissions.filter((permission) => canOfferPermission(held, permission)),
  );

  type Dialog =
    { readonly kind: 'new' } | { readonly kind: 'edit' | 'delete'; readonly role: RoleRow } | null;
  let dialog = $state<Dialog>(null);
  const closeDialog = () => {
    dialog = null;
  };
  let ticked = $state<readonly Permission[]>([]);

  const openDialog = (next: Dialog) => {
    ticked = next?.kind === 'edit' ? next.role.permissions : [];
    dialog = next;
  };

  const toggle = (permission: Permission, on: boolean) => {
    ticked = on ? [...ticked, permission] : ticked.filter((p) => p !== permission);
  };

  const closeOnSuccess =
    () =>
    async ({ result, update }: { result: { type: string }; update: () => Promise<void> }) => {
      await update();
      if (result.type === 'success') dialog = null;
    };

  const plural = (count: number) => (count === 1 ? '1 Singer' : `${count.toString()} Singers`);
</script>

{#if form?.problem !== undefined}
  <AlertMessage>{form.problem}</AlertMessage>
{/if}

<div class="flex items-center justify-between">
  <h2 class="text-lg font-semibold">Roles</h2>
  <button
    class="min-h-11 rounded bg-emerald-700 px-4 font-medium text-white"
    disabled={!mayOpenAdmin(held)}
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
        <p class="text-sm opacity-70">{plural(role.singerCount)}</p>
      </div>
      <ul class="flex flex-wrap gap-1" aria-label="Permissions">
        {#each role.permissions as permission (permission)}
          <li class="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-900">{permission}</li>
        {/each}
      </ul>
      {#if hasNoRead(role.permissions)}
        <p class="text-sm text-amber-700 dark:text-amber-400">
          Without read, Singers with only this Role stay Pending.
        </p>
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
  open={dialog !== null}
  onClose={closeDialog}
  title={dialog?.kind === 'new'
    ? 'New Role'
    : dialog?.kind === 'edit'
      ? `Edit ${dialog.role.name}`
      : dialog === null
        ? ''
        : `Delete ${dialog.role.name}?`}
  description={dialog?.kind === 'delete'
    ? `${plural(dialog.role.singerCount)} will lose this Role. This cannot be undone.`
    : undefined}
>
  {#if dialog?.kind === 'delete'}
    <form method="POST" action="?/delete" use:enhance={closeOnSuccess} class="flex flex-col gap-3">
      <input type="hidden" name="role" value={dialog.role.id} />
      <button class="min-h-11 rounded bg-red-700 px-4 font-medium text-white">Delete Role</button>
      <button type="button" class="min-h-11 rounded border px-4" onclick={closeDialog}
        >Cancel</button
      >
    </form>
  {:else if dialog !== null}
    <form
      method="POST"
      action={dialog.kind === 'new' ? '?/create' : '?/update'}
      use:enhance={closeOnSuccess}
      class="flex flex-col gap-3"
    >
      {#if dialog.kind === 'edit'}
        <input type="hidden" name="role" value={dialog.role.id} />
      {/if}
      <label class="flex flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          required
          value={dialog.kind === 'edit' ? dialog.role.name : ''}
          class="min-h-11 rounded border bg-transparent px-2"
        />
      </label>
      <fieldset class="flex flex-col gap-2">
        <legend class="text-sm">Permissions (at least one)</legend>
        {#each offered as permission (permission)}
          <label class="flex items-start gap-2">
            <input
              type="checkbox"
              name="permission"
              value={permission}
              class="mt-1"
              checked={ticked.includes(permission)}
              onchange={(event) => {
                toggle(permission, event.currentTarget.checked);
              }}
            />
            <span>
              {permission}
              <span class="block text-xs opacity-70">{permissionDescriptions[permission]}</span>
            </span>
          </label>
        {/each}
      </fieldset>
      {#if hasNoRead(ticked)}
        <p class="text-sm text-amber-700 dark:text-amber-400">
          Without read, Singers with only this Role stay Pending.
        </p>
      {/if}
      <button
        class="min-h-11 rounded bg-emerald-700 px-4 font-medium text-white disabled:opacity-60"
        disabled={ticked.length === 0}>Save Role</button
      >
      <button type="button" class="min-h-11 rounded border px-4" onclick={closeDialog}
        >Cancel</button
      >
    </form>
  {/if}
</Modal>
