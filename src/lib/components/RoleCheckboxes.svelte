<script lang="ts">
  import { isGrantableRole, roleBlockedReason } from '../core/admin-rules';
  import type { Permission } from '../core/permissions';
  import type { RoleRow } from '../shell/admin';

  const {
    roles,
    held,
    selected,
  }: {
    readonly roles: readonly RoleRow[];
    readonly held: readonly Permission[];
    readonly selected: readonly string[];
  } = $props();
</script>

<fieldset class="flex flex-col gap-1">
  <legend class="text-sm">Roles</legend>
  {#each roles.filter(isGrantableRole) as role (role.id)}
    {@const reason = roleBlockedReason(held, role)}
    <label class="flex min-h-11 items-start gap-2 py-1">
      <input
        type="checkbox"
        name="role"
        value={role.id}
        class="mt-1"
        checked={selected.includes(role.id)}
        disabled={reason !== null}
      />
      <span>
        {role.name}
        {#if reason !== null}<span class="block text-xs opacity-70">{reason}</span>{/if}
      </span>
    </label>
  {/each}
</fieldset>
