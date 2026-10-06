<script lang="ts">
  import { roleName } from '../admin.svelte';
  let { roleIds, empty = 'No Roles' }: { roleIds: string[]; empty?: string } = $props();
</script>

<span class="inline-flex flex-wrap gap-1">
  {#each roleIds as id (id)}
    <span class="rounded-full px-2 py-0.5 text-xs font-semibold {id === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'}">{roleName(id)}</span>
  {:else}
    <span class="text-xs text-zinc-500">{empty}</span>
  {/each}
</span>
