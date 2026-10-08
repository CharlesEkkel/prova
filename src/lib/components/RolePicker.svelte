<script lang="ts">
  // The Roles a Singer can be given, as checkboxes that submit with the surrounding form. One that
  // needs manage-admins is shown but disabled, with the reason.
  import { isGrantableRole, roleBlockedReason } from '../core/admin-rules';
  import { permissionLabels, type Permission } from '../core/permissions';
  import type { RoleRow } from '../shell/admin';
  import CheckRow from './ui/CheckRow.svelte';

  const {
    roles,
    held,
    selected,
    idPrefix,
  }: {
    readonly roles: readonly RoleRow[];
    readonly held: readonly Permission[];
    readonly selected: readonly string[];
    readonly idPrefix: string;
  } = $props();
</script>

<div class="grid gap-1 sm:grid-cols-2">
  {#each roles.filter(isGrantableRole) as role (role.id)}
    {@const reason = roleBlockedReason(held, role)}
    <CheckRow
      id="{idPrefix}-{role.id}"
      name="role"
      value={role.id}
      checked={selected.includes(role.id)}
      disabled={reason !== null}
      title={role.name}
      detail={reason ??
        role.permissions.map((permission) => permissionLabels[permission]).join(', ')}
    />
  {/each}
</div>
