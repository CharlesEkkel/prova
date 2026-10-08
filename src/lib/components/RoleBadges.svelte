<script lang="ts">
  type Badge = { readonly name: string; readonly builtin: boolean };

  const { badges, owner = false }: { readonly badges: readonly Badge[]; readonly owner?: boolean } =
    $props();

  const base = 'rounded-full px-2 py-0.5 text-xs font-semibold';
  const amber = 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300';
  const normal = 'bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300';
</script>

<ul class="inline-flex flex-wrap gap-1" aria-label="Roles">
  {#if owner}
    <li class="{base} {amber}">Owner</li>
  {/if}
  {#each badges as badge (badge.name)}
    <li class="{base} {badge.builtin ? amber : normal}">{badge.name}</li>
  {:else}
    {#if !owner}<li class="text-xs text-zinc-500">No Roles</li>{/if}
  {/each}
</ul>
