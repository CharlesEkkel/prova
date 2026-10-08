<script lang="ts">
  import { enhance } from '$app/forms';
  import AlertMessage from '../../lib/components/AlertMessage.svelte';
  import { createDialogState } from '../../lib/components/dialog-state.svelte';
  import DialogActions from '../../lib/components/DialogActions.svelte';
  import Modal from '../../lib/components/Modal.svelte';
  import RoleBadges from '../../lib/components/RoleBadges.svelte';
  import RoleCheckboxes from '../../lib/components/RoleCheckboxes.svelte';
  import { canChangeSinger, isPendingSinger } from '../../lib/core/admin-rules';
  import type { SingerRow } from '../../lib/shell/admin';
  import { closeOnSuccess } from '../../lib/shell/enhance';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  const held = $derived(data.permissions);
  const isPending = (singer: SingerRow) => isPendingSinger(singer.permissions);
  const pending = $derived(data.singers.filter(isPending));
  const approved = $derived(data.singers.filter((singer) => !isPending(singer)));

  type Dialog = { readonly kind: 'edit-roles' | 'remove' | 'decline'; readonly singer: SingerRow };
  const dialog = createDialogState<Dialog>();
  const current = $derived(dialog.current);
  const closeIfDone = closeOnSuccess(dialog.close);

  const rolesOf = (singer: SingerRow) => singer.roles.map((role) => role.id);
  const namesOf = (singer: SingerRow) => singer.roles.map((role) => role.name);

  const titles = {
    'edit-roles': 'Edit Roles',
    decline: 'Decline this sign-up?',
    remove: 'Remove this Singer?',
  } as const;
  const warnings = {
    decline: 'loses their sign-in. If they sign in again they will be waiting for approval afresh.',
    remove:
      'loses access and their sign-in is deleted. If they sign in again they start as a Pending Singer.',
  } as const;
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
        <RoleBadges names={namesOf(singer)} />
        <form method="POST" action="?/setRoles" use:enhance class="flex flex-col gap-2">
          <input type="hidden" name="singer" value={singer.id} />
          <RoleCheckboxes roles={data.roles} {held} selected={rolesOf(singer)} />
          <div class="flex gap-2">
            <button
              class="min-h-11 rounded bg-emerald-700 px-4 font-medium text-white disabled:opacity-60"
              disabled={!canChangeSinger(held, singer)}>Approve</button
            >
            <button
              type="button"
              class="min-h-11 rounded border px-4 disabled:opacity-60"
              disabled={!canChangeSinger(held, singer)}
              onclick={() => {
                dialog.open({ kind: 'decline', singer });
              }}>Decline</button
            >
          </div>
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
        <RoleBadges names={namesOf(singer)} owner={singer.isOwner} />
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
              dialog.open({ kind: 'edit-roles', singer });
            }}>Edit Roles</button
          >
          <button
            class="min-h-11 rounded border px-4 disabled:opacity-60"
            disabled={!canChangeSinger(held, singer)}
            onclick={() => {
              dialog.open({ kind: 'remove', singer });
            }}>Remove</button
          >
        </div>
      </li>
    {/each}
  </ul>
</section>

<Modal
  open={current !== null}
  onClose={dialog.close}
  title={current === null
    ? ''
    : current.kind === 'edit-roles'
      ? `${titles[current.kind]} for ${current.singer.displayName}`
      : titles[current.kind]}
  description={current === null || current.kind === 'edit-roles'
    ? undefined
    : `${current.singer.displayName} ${warnings[current.kind]}`}
>
  {#if current?.kind === 'edit-roles'}
    <form method="POST" action="?/setRoles" use:enhance={closeIfDone} class="flex flex-col gap-3">
      <input type="hidden" name="singer" value={current.singer.id} />
      <RoleCheckboxes roles={data.roles} {held} selected={rolesOf(current.singer)} />
      <DialogActions label="Save Roles" onCancel={dialog.close} />
    </form>
  {:else if current !== null}
    <form method="POST" action="?/remove" use:enhance={closeIfDone} class="flex flex-col gap-3">
      <input type="hidden" name="singer" value={current.singer.id} />
      <DialogActions
        label={current.kind === 'decline' ? 'Decline' : 'Remove'}
        tone="danger"
        onCancel={dialog.close}
      />
    </form>
  {/if}
</Modal>
