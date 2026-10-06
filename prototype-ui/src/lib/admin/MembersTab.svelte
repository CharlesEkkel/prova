<script lang="ts">
  // Pending sign-ups (approve with a Role, or decline) and the current members (edit Roles, remove).
  import { AlertDialog, Avatar, Select } from 'bits-ui';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import UserX from '@lucide/svelte/icons/user-x';
  import Users from '@lucide/svelte/icons/users';
  import { roles } from '../access.svelte';
  import { adminCount, approveMember, declineMember, members, removeMember, setMemberRoles, type Member } from '../admin.svelte';
  import type { Action } from '../actions';
  import Btn from '../ui/Btn.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import Modal from '../ui/Modal.svelte';
  import RoleChips from './RoleChips.svelte';
  import RolePicker from './RolePicker.svelte';
  const pending = $derived(members.filter((m) => m.pending));
  const active = $derived(members.filter((m) => !m.pending));
  const roleItems = $derived(roles.map((r) => ({ value: r.id, label: r.name })));
  let choice = $state<Record<string, string>>({});
  let editing = $state<Member | null>(null);
  let draft = $state<string[]>([]);
  let removing = $state<Member | null>(null);
  const onlyAdmin = (m: Member) => m.roleIds.includes('admin') && adminCount() <= 1;
  const actions = (m: Member): Action[] => [
    { key: 'roles', label: 'Edit Roles…', icon: Users, run: () => { editing = m; draft = [...m.roleIds]; } },
    ...(onlyAdmin(m) ? [] : [{ key: 'remove', label: 'Remove from the choir…', icon: UserX, danger: true, run: () => (removing = m) }])
  ];
  const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const avatar = 'size-10 shrink-0 overflow-hidden rounded-full bg-violet-200 text-violet-800';
</script>

<div class="flex flex-col gap-8">
  <section>
    <h2 class="mb-1 text-lg font-semibold">Pending sign-ups {#if pending.length}<span class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{pending.length}</span>{/if}</h2>
    <p class="mb-3 text-sm text-zinc-500">People who signed up without an Invite Link. Pick a Role to let them in.</p>
    <ul class="flex flex-col gap-2">
      {#each pending as m (m.id)}
        <li class="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <Avatar.Root class={avatar}><Avatar.Fallback class="grid size-full place-items-center text-sm font-semibold">{initials(m.name)}</Avatar.Fallback></Avatar.Root>
          <div class="min-w-0 flex-1"><p class="truncate font-medium">{m.name}</p><p class="truncate text-sm text-zinc-500">{m.email} · {m.part} · {m.pending?.via}</p></div>
          <Select.Root type="single" value={choice[m.id] ?? 'reader'} onValueChange={(v) => (choice[m.id] = v)} items={roleItems}>
            <Select.Trigger aria-label="Role for {m.name}" class="flex h-10 min-w-36 items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              {roleItems.find((r) => r.value === (choice[m.id] ?? 'reader'))?.label}<ChevronDown class="size-4 text-zinc-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content sideOffset={6} class="z-[70] w-(--bits-select-anchor-width) rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                <Select.Viewport>{#each roleItems as r (r.value)}<Select.Item value={r.value} label={r.label} class="flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm data-highlighted:bg-zinc-100 data-selected:font-semibold dark:data-highlighted:bg-zinc-800">{r.label}</Select.Item>{/each}</Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <div class="flex gap-2">
            <Btn size="sm" onclick={() => approveMember(m.id, [choice[m.id] ?? 'reader'])}>Approve</Btn>
            <Btn size="sm" variant="ghost" onclick={() => declineMember(m.id)}>Decline</Btn>
          </div>
        </li>
      {:else}
        <li class="rounded-2xl border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500 dark:border-zinc-700">No one is waiting.</li>
      {/each}
    </ul>
  </section>

  <section>
    <h2 class="mb-3 text-lg font-semibold">Members · {active.length}</h2>
    <ul class="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {#each active as m (m.id)}
        <li class="pr-1">
          <ManageMenu actions={actions(m)} label="Actions for {m.name}">
            <div class="flex min-h-16 items-center gap-3 py-2 pl-3">
              <Avatar.Root class={avatar}><Avatar.Fallback class="grid size-full place-items-center text-sm font-semibold">{initials(m.name)}</Avatar.Fallback></Avatar.Root>
              <div class="min-w-0 flex-1"><p class="truncate font-medium">{m.name}{#if m.id === 'u1'}<span class="ml-1.5 text-xs font-normal text-zinc-500">you</span>{/if}</p><p class="truncate text-sm text-zinc-500">{m.email} · {m.part}</p></div>
              <RoleChips roleIds={m.roleIds} />
            </div>
          </ManageMenu>
        </li>
      {/each}
    </ul>
  </section>
</div>

{#if editing}
  {@const m = editing}
  <Modal open onclose={() => (editing = null)} title="Roles for {m.name}" description="A member holds every Permission from every Role they have.">
    <RolePicker bind:value={draft} idPrefix="edit" blocked={(r) => (r.id === 'admin' && onlyAdmin(m) ? 'The only Admin keeps this Role' : null)} />
    {#snippet footer()}
      <Btn variant="ghost" onclick={() => (editing = null)}>Cancel</Btn>
      <Btn disabled={draft.length === 0} onclick={() => { setMemberRoles(m.id, draft); editing = null; }}>Save Roles</Btn>
    {/snippet}
  </Modal>
{/if}

{#if removing}
  {@const m = removing}
  <Modal open alert onclose={() => (removing = null)} title="Remove {m.name}?" description="They lose access straight away. They can sign up again and be approved.">
    <p class="text-sm text-zinc-600 dark:text-zinc-400">Their private Part Overrides go with them.</p>
    {#snippet footer()}
      <AlertDialog.Cancel class="inline-flex h-11 items-center rounded-full px-5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => { removeMember(m.id); removing = null; }} class="inline-flex h-11 items-center rounded-full bg-red-600 px-5 font-medium text-white hover:bg-red-500">Remove</AlertDialog.Action>
    {/snippet}
  </Modal>
{/if}
