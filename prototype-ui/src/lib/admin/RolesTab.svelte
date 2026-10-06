<script lang="ts">
  // Roles are named, composable bundles of Permissions. Admin is built in and locked.
  import { AlertDialog, Checkbox, Label } from 'bits-ui';
  import Check from '@lucide/svelte/icons/check';
  import Lock from '@lucide/svelte/icons/lock';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash from '@lucide/svelte/icons/trash';
  import { PERMISSIONS, roles, type Permission, type Role } from '../access.svelte';
  import { deleteRole, membersWithRole, saveRole } from '../admin.svelte';
  import type { Action } from '../actions';
  import Btn from '../ui/Btn.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import Modal from '../ui/Modal.svelte';
  import { errorText, fieldLabel, hint, input } from '../ui/styles';

  let editing = $state<{ id: string | null } | null>(null);
  let name = $state('');
  let perms = $state<Permission[]>(['read']);
  let deleting = $state<Role | null>(null);

  const clash = $derived(roles.some((r) => r.id !== editing?.id && r.name.toLowerCase() === name.trim().toLowerCase()));
  const valid = $derived(name.trim() !== '' && !clash && perms.length > 0);
  function openNew() {
    editing = { id: null };
    name = '';
    perms = ['read'];
  }
  function openEdit(r: Role) {
    editing = { id: r.id };
    name = r.name;
    perms = [...r.permissions];
  }
  const actions = (r: Role): Action[] =>
    r.locked ? [] : [
      { key: 'edit', label: 'Edit Role…', icon: Pencil, run: () => openEdit(r) },
      { key: 'delete', label: 'Delete Role…', icon: Trash, danger: true, run: () => (deleting = r) }
    ];
  const label = (k: Permission) => PERMISSIONS.find((p) => p.key === k)?.label ?? k;
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-start justify-between gap-3">
    <p class="max-w-prose text-sm text-zinc-500">A Role is a named bundle of Permissions. Give people several to combine them. Admin always holds every Permission.</p>
    <Btn size="sm" variant="soft" onclick={openNew}><Plus class="size-4" /> New Role</Btn>
  </div>

  <ul class="flex flex-col gap-2">
    {#each roles as r (r.id)}
      <li class="pr-1">
        <ManageMenu actions={actions(r)} label="Actions for {r.name} Role" class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-2 font-semibold">{r.name}{#if r.locked}<span class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"><Lock class="size-3" /> Built in</span>{/if}</p>
              <p class="text-sm text-zinc-500">{membersWithRole(r.id)} member{membersWithRole(r.id) === 1 ? '' : 's'}</p>
            </div>
            <span class="flex flex-wrap gap-1">{#each r.permissions as p (p)}<span class="rounded-md border border-zinc-300 px-2 py-0.5 text-xs font-medium dark:border-zinc-700">{label(p)}</span>{/each}</span>
          </div>
        </ManageMenu>
      </li>
    {/each}
  </ul>
</div>

{#if editing}
  <Modal open onclose={() => (editing = null)} title={editing.id ? 'Edit Role' : 'New Role'} description="Pick the Permissions this Role grants.">
    <div class="flex flex-col gap-5">
      <div>
        <label for="role-name" class={fieldLabel}>Name</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input id="role-name" class={input} bind:value={name} autofocus />
        {#if clash}<p class={errorText}>A Role with that name already exists.</p>{/if}
      </div>
      <div>
        <span class={fieldLabel}>Permissions</span>
        <ul class="flex flex-col gap-1">
          {#each PERMISSIONS as p (p.key)}
            <li class="flex items-start gap-3 px-2 py-1.5">
              <Checkbox.Root id="perm-{p.key}" checked={perms.includes(p.key)} onCheckedChange={(c) => (perms = c ? [...perms, p.key] : perms.filter((x) => x !== p.key))} class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-zinc-400 data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600 dark:border-zinc-600">
                {#snippet children({ checked })}{#if checked}<Check class="size-4 text-white" />{/if}{/snippet}
              </Checkbox.Root>
              <Label.Root for="perm-{p.key}" class="text-sm"><b class="block">{p.label}</b><span class="text-zinc-500">{p.hint}</span></Label.Root>
            </li>
          {/each}
        </ul>
        {#if perms.length === 0}<p class={errorText}>Pick at least one Permission.</p>{:else if !perms.includes('read')}<p class={hint}>Without Read, people with only this Role can't listen to anything.</p>{/if}
      </div>
    </div>
    {#snippet footer()}
      <Btn variant="ghost" onclick={() => (editing = null)}>Cancel</Btn>
      <Btn disabled={!valid} onclick={() => { saveRole(editing?.id ?? null, name.trim(), perms); editing = null; }}>{editing.id ? 'Save Role' : 'Create Role'}</Btn>
    {/snippet}
  </Modal>
{/if}

{#if deleting}
  {@const r = deleting}
  <Modal open alert onclose={() => (deleting = null)} title="Delete the {r.name} Role?" description="{membersWithRole(r.id)} member{membersWithRole(r.id) === 1 ? '' : 's'} hold it. They lose its Permissions.">
    <p class="text-sm text-zinc-600 dark:text-zinc-400">It is also taken off any Invite Links that grant it. Permissions from their other Roles are kept.</p>
    {#snippet footer()}
      <AlertDialog.Cancel class="inline-flex h-11 items-center rounded-full px-5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => { deleteRole(r.id); deleting = null; }} class="inline-flex h-11 items-center rounded-full bg-red-600 px-5 font-medium text-white hover:bg-red-500">Delete Role</AlertDialog.Action>
    {/snippet}
  </Modal>
{/if}
