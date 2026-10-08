<script lang="ts">
  import { enhance } from '$app/forms';
  import AlertMessage from '../../lib/components/AlertMessage.svelte';
  import Modal from '../../lib/components/Modal.svelte';
  import { canChangeSinger } from '../../lib/core/admin-rules';
  import type { SingerRow } from '../../lib/shell/admin';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  const held = $derived(data.permissions);
  const isPending = (singer: SingerRow) => !singer.permissions.includes('read');
  const pending = $derived(data.singers.filter(isPending));
  const approved = $derived(data.singers.filter((singer) => !isPending(singer)));
  // Admin and Owner are Roles too; Owner is never offered, as nobody can be granted it.
  const grantable = $derived(
    data.roles.filter((role) => !(role.isBuiltin && role.name === 'Owner')),
  );

  type Dialog = {
    readonly kind: 'edit-roles' | 'remove' | 'decline';
    readonly singer: SingerRow;
  } | null;
  let dialog = $state<Dialog>(null);
  const closeDialog = () => {
    dialog = null;
  };
  const open = $derived(dialog !== null);

  // Close the dialog once the change went through; a refusal keeps it open so nothing is lost.
  const closeOnSuccess =
    () =>
    async ({ result, update }: { result: { type: string }; update: () => Promise<void> }) => {
      await update();
      if (result.type === 'success') dialog = null;
    };
</script>

{#if form?.problem !== undefined}
  <AlertMessage>{form.problem}</AlertMessage>
{/if}

<section aria-labelledby="pending-heading" class="flex flex-col gap-3">
  <h2 id="pending-heading" class="text-lg font-semibold">Pending Singers ({pending.length})</h2>
  {#if pending.length === 0}
    <p class="opacity-70">Nobody is waiting for approval.</p>
  {/if}
  <ul class="flex flex-col gap-3">
    {#each pending as singer (singer.id)}
      <li class="flex flex-col gap-3 rounded border p-3" data-testid="pending-singer">
        <div>
          <p class="font-medium">{singer.displayName}</p>
          <p class="text-sm opacity-70">{singer.email}</p>
          <p class="text-sm opacity-70">
            {singer.voicePart ?? 'No Voice Part yet'} · Signed up: {singer.signedUpVia}
          </p>
        </div>
        <form method="POST" action="?/setRoles" use:enhance class="flex flex-wrap items-end gap-2">
          <input type="hidden" name="singer" value={singer.id} />
          <label class="flex flex-col text-sm">
            Role
            <select name="role" required class="min-h-11 rounded border bg-transparent px-2">
              {#each grantable as role (role.id)}
                <option
                  value={role.id}
                  disabled={!canChangeSinger(held, singer) ||
                    (role.permissions.includes('manage-users') && !held.includes('manage-admins'))}
                >
                  {role.name}
                </option>
              {/each}
            </select>
          </label>
          <button
            class="min-h-11 rounded bg-emerald-700 px-4 font-medium text-white disabled:opacity-60"
            disabled={!canChangeSinger(held, singer)}>Approve</button
          >
          <button
            type="button"
            class="min-h-11 rounded border px-4 disabled:opacity-60"
            disabled={!canChangeSinger(held, singer)}
            onclick={() => {
              dialog = { kind: 'decline', singer };
            }}>Decline</button
          >
        </form>
      </li>
    {/each}
  </ul>
</section>

<section aria-labelledby="singers-heading" class="flex flex-col gap-3">
  <h2 id="singers-heading" class="text-lg font-semibold">Singers ({approved.length})</h2>
  <ul class="flex flex-col gap-3">
    {#each approved as singer (singer.id)}
      <li class="flex flex-col gap-3 rounded border p-3" data-testid="singer">
        <div>
          <p class="font-medium">{singer.displayName}</p>
          <p class="text-sm opacity-70">{singer.email}</p>
        </div>
        <ul class="flex flex-wrap gap-1" aria-label="Roles">
          {#if singer.isOwner}
            <li class="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">Owner</li>
          {/if}
          {#each singer.roles as role (role.id)}
            <li class="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-900">
              {role.name}
            </li>
          {/each}
        </ul>
        {#if singer.isOwner}
          <p class="text-sm opacity-70">An Owner is managed in the deployment, not here.</p>
        {:else if !canChangeSinger(held, singer)}
          <p class="text-sm opacity-70">Only an Owner can change a Singer who manages users.</p>
        {/if}
        <div class="flex gap-2">
          <button
            class="min-h-11 rounded border px-4 disabled:opacity-60"
            disabled={!canChangeSinger(held, singer)}
            onclick={() => {
              dialog = { kind: 'edit-roles', singer };
            }}>Edit Roles</button
          >
          <button
            class="min-h-11 rounded border px-4 disabled:opacity-60"
            disabled={!canChangeSinger(held, singer)}
            onclick={() => {
              dialog = { kind: 'remove', singer };
            }}>Remove</button
          >
        </div>
      </li>
    {/each}
  </ul>
</section>

<Modal
  {open}
  onClose={closeDialog}
  title={dialog?.kind === 'edit-roles'
    ? `Edit Roles for ${dialog.singer.displayName}`
    : dialog?.kind === 'decline'
      ? 'Decline this sign-up?'
      : 'Remove this Singer?'}
  description={dialog?.kind === 'edit-roles'
    ? undefined
    : dialog?.kind === 'decline'
      ? `${dialog.singer.displayName} loses their sign-in. If they sign in again they will be waiting for approval afresh.`
      : dialog === null
        ? undefined
        : `${dialog.singer.displayName} loses access and their sign-in is deleted. If they sign in again they start as a Pending Singer.`}
>
  {#if dialog?.kind === 'edit-roles'}
    {@const singer = dialog.singer}
    <form
      method="POST"
      action="?/setRoles"
      use:enhance={closeOnSuccess}
      class="flex flex-col gap-3"
    >
      <input type="hidden" name="singer" value={singer.id} />
      {#each grantable as role (role.id)}
        <label class="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            name="role"
            value={role.id}
            checked={singer.roles.some((owned) => owned.id === role.id)}
            disabled={role.permissions.includes('manage-users') && !held.includes('manage-admins')}
          />
          {role.name}
        </label>
      {/each}
      <button class="min-h-11 rounded bg-emerald-700 px-4 font-medium text-white">Save Roles</button
      >
      <button type="button" class="min-h-11 rounded border px-4" onclick={closeDialog}
        >Cancel</button
      >
    </form>
  {:else if dialog !== null}
    <form method="POST" action="?/remove" use:enhance={closeOnSuccess} class="flex flex-col gap-3">
      <input type="hidden" name="singer" value={dialog.singer.id} />
      <button class="min-h-11 rounded bg-red-700 px-4 font-medium text-white">
        {dialog.kind === 'decline' ? 'Decline' : 'Remove'}
      </button>
      <button type="button" class="min-h-11 rounded border px-4" onclick={closeDialog}
        >Cancel</button
      >
    </form>
  {/if}
</Modal>
