<script lang="ts">
  import { enhance } from '$app/forms';
  import { AlertDialog, Avatar } from 'bits-ui';
  import { UserX, Users } from '@lucide/svelte';
  import AlertMessage from '../../../lib/components/AlertMessage.svelte';
  import { createDialogState } from '../../../lib/components/dialog-state.svelte';
  import RoleBadges from '../../../lib/components/RoleBadges.svelte';
  import RolePicker from '../../../lib/components/RolePicker.svelte';
  import Btn from '../../../lib/components/ui/Btn.svelte';
  import ManageMenu from '../../../lib/components/ui/ManageMenu.svelte';
  import Modal from '../../../lib/components/ui/Modal.svelte';
  import { canChangeSinger, isPendingSinger } from '../../../lib/core/admin-rules';
  import type { SingerRow } from '../../../lib/shell/admin';
  import { closeOnSuccess } from '../../../lib/shell/enhance';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  const held = $derived(data.permissions);
  const isPending = (singer: SingerRow) => isPendingSinger(singer.permissions);
  const pending = $derived(data.singers.filter(isPending));
  const approved = $derived(data.singers.filter((singer) => !isPending(singer)));

  type Dialog = {
    readonly kind: 'approve' | 'edit-roles' | 'remove' | 'decline';
    readonly singer: SingerRow;
  };
  const dialog = createDialogState<Dialog>();
  const current = $derived(dialog.current);
  const closeIfDone = closeOnSuccess(dialog.close);

  const builtinIds = $derived(new Set(data.roles.filter((r) => r.isBuiltin).map((r) => r.id)));
  const rolesOf = (singer: SingerRow) => singer.roles.map((role) => role.id);
  const badgesOf = (singer: SingerRow) =>
    singer.roles.map((role) => ({ name: role.name, builtin: builtinIds.has(role.id) }));
  const initials = (name: string) =>
    name
      .split(' ')
      .map((word) => word.slice(0, 1))
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const actionsOf = (singer: SingerRow) => [
    {
      key: 'roles',
      label: 'Edit Roles…',
      icon: Users,
      disabled: !canChangeSinger(held, singer),
      run: () => {
        dialog.open({ kind: 'edit-roles', singer });
      },
    },
    {
      key: 'remove',
      label: 'Remove from the choir…',
      icon: UserX,
      danger: true,
      disabled: !canChangeSinger(held, singer),
      run: () => {
        dialog.open({ kind: 'remove', singer });
      },
    },
  ];

  const avatar = 'size-10 shrink-0 overflow-hidden rounded-full bg-primary-200 text-primary-800';
  const card = 'rounded-2xl border bg-white dark:bg-zinc-900';
</script>

{#if form?.problem !== undefined}
  <div class="mb-4"><AlertMessage>{form.problem}</AlertMessage></div>
{/if}

<div class="flex flex-col gap-8">
  <section aria-labelledby="pending-heading">
    <h2 id="pending-heading" class="mb-1 text-lg font-semibold">
      Pending Singers
      {#if pending.length > 0}
        <span
          class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
          >{pending.length}</span
        >
      {/if}
    </h2>
    <p class="mb-3 text-sm text-zinc-500">
      People who have signed in and are waiting. Approve them with the Roles they should have.
    </p>
    <ul class="flex flex-col gap-2">
      {#each pending as singer (singer.id)}
        <li class="{card} flex flex-col gap-3 p-3" data-testid="pending-singer">
          <div class="flex items-center gap-3">
            <Avatar.Root class={avatar}>
              <Avatar.Fallback class="grid size-full place-items-center text-sm font-semibold">
                {initials(singer.displayName)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{singer.displayName}</p>
              <p class="truncate text-sm text-zinc-500">
                {singer.email} · {singer.voicePart ?? 'No Voice Part yet'} · {singer.signedUpVia}
              </p>
            </div>
          </div>
          {#if singer.roles.length > 0}<RoleBadges badges={badgesOf(singer)} />{/if}
          <div class="flex gap-2">
            <Btn
              size="sm"
              disabled={!canChangeSinger(held, singer)}
              onclick={() => {
                dialog.open({ kind: 'approve', singer });
              }}>Approve</Btn
            >
            <Btn
              size="sm"
              variant="ghost"
              disabled={!canChangeSinger(held, singer)}
              onclick={() => {
                dialog.open({ kind: 'decline', singer });
              }}>Decline</Btn
            >
          </div>
        </li>
      {:else}
        <li
          class="rounded-2xl border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500 dark:border-zinc-700"
        >
          Nobody is waiting for approval.
        </li>
      {/each}
    </ul>
  </section>

  <section aria-labelledby="singers-heading">
    <h2 id="singers-heading" class="mb-3 text-lg font-semibold">Singers · {approved.length}</h2>
    <ul class="{card} divide-y overflow-hidden">
      {#each approved as singer (singer.id)}
        <li class="pr-1" data-testid="singer">
          <ManageMenu actions={actionsOf(singer)} label="Actions for {singer.displayName}">
            <div class="flex min-h-16 items-center gap-3 py-2 pl-3">
              <Avatar.Root class={avatar}>
                <Avatar.Fallback class="grid size-full place-items-center text-sm font-semibold">
                  {initials(singer.displayName)}
                </Avatar.Fallback>
              </Avatar.Root>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{singer.displayName}</p>
                <p class="truncate text-sm text-zinc-500">
                  {singer.email} · {singer.voicePart ?? 'No Voice Part yet'}
                </p>
                {#if singer.isOwner}
                  <p class="text-xs text-zinc-500">
                    An Owner is managed in the deployment, not here.
                  </p>
                {:else if !canChangeSinger(held, singer)}
                  <p class="text-xs text-zinc-500">
                    Only an Owner can change a Singer who manages users.
                  </p>
                {/if}
              </div>
              <RoleBadges badges={badgesOf(singer)} owner={singer.isOwner} />
            </div>
          </ManageMenu>
        </li>
      {/each}
    </ul>
  </section>
</div>

<Modal
  open={current?.kind === 'edit-roles' || current?.kind === 'approve'}
  onClose={dialog.close}
  title={current?.kind === 'approve'
    ? `Approve ${current.singer.displayName}`
    : current?.kind === 'edit-roles'
      ? `Roles for ${current.singer.displayName}`
      : ''}
  description={current?.kind === 'approve'
    ? 'Pick their Roles to let them in. A Singer holds every Permission from every Role they have.'
    : 'A Singer holds every Permission from every Role they have.'}
>
  {#if current?.kind === 'edit-roles' || current?.kind === 'approve'}
    <form
      id="edit-roles-form"
      method="POST"
      action="?/setRoles"
      use:enhance={closeIfDone}
      class="flex flex-col gap-3"
    >
      <input type="hidden" name="singer" value={current.singer.id} />
      <RolePicker
        roles={data.roles}
        {held}
        selected={rolesOf(current.singer)}
        idPrefix="edit-{current.singer.id}"
      />
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={dialog.close}>Cancel</Btn>
    <Btn type="submit" form="edit-roles-form"
      >{current?.kind === 'approve' ? 'Approve' : 'Save Roles'}</Btn
    >
  {/snippet}
</Modal>

<Modal
  alert
  open={current?.kind === 'remove' || current?.kind === 'decline'}
  onClose={dialog.close}
  title={current?.kind === 'decline'
    ? 'Decline this sign-up?'
    : current === null
      ? ''
      : `Remove ${current.singer.displayName}?`}
  description={current?.kind === 'decline'
    ? `${current.singer.displayName} loses their sign-in. If they sign in again they will be waiting for approval afresh.`
    : current === null
      ? ''
      : 'They lose access straight away and their sign-in is deleted. If they sign in again they start as a Pending Singer.'}
>
  {#if current?.kind === 'remove' || current?.kind === 'decline'}
    <form id="remove-form" method="POST" action="?/remove" use:enhance={closeIfDone}>
      <input type="hidden" name="singer" value={current.singer.id} />
    </form>
  {/if}
  {#snippet footer()}
    <AlertDialog.Cancel>
      {#snippet child({ props })}
        <Btn variant="ghost" {...props}>Cancel</Btn>
      {/snippet}
    </AlertDialog.Cancel>
    <Btn variant="danger" type="submit" form="remove-form">
      {current?.kind === 'decline' ? 'Decline' : 'Remove'}
    </Btn>
  {/snippet}
</Modal>
