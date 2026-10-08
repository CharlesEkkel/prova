<script lang="ts">
  // One Role as the Roles tab lists it: name, how many Singers hold it, and its Permissions.
  import { Lock } from '@lucide/svelte';
  import { canChangeRole, hasNoRead } from '../core/admin-rules';
  import { permissionLabels, type Permission } from '../core/permissions';
  import type { RoleRow } from '../shell/admin';

  const { role, held }: { readonly role: RoleRow; readonly held: readonly Permission[] } = $props();

  const singers = $derived(
    role.singerCount === 1 ? '1 Singer' : `${role.singerCount.toString()} Singers`,
  );
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
  <div class="min-w-0 flex-1">
    <p class="flex items-center gap-2 font-semibold">
      {role.name}
      {#if role.isBuiltin}
        <span
          class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          ><Lock class="size-3" /> Built in</span
        >
      {/if}
    </p>
    <p class="text-sm text-zinc-500">{singers}</p>
    {#if hasNoRead(role.permissions)}
      <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">
        Without Read, Singers with only this Role stay Pending.
      </p>
    {/if}
    {#if !role.isBuiltin && !canChangeRole(held, role)}
      <p class="mt-1 text-xs text-zinc-500">
        Only an Owner can change a Role that includes Manage users.
      </p>
    {/if}
  </div>
  <ul class="flex flex-wrap gap-1" aria-label="Permissions">
    {#each role.permissions as permission (permission)}
      <li
        class="rounded-md border border-zinc-300 px-2 py-0.5 text-xs font-medium dark:border-zinc-700"
      >
        {permissionLabels[permission]}
      </li>
    {/each}
  </ul>
</div>
