<script lang="ts">
  const { names, owner = false }: { readonly names: readonly string[]; readonly owner?: boolean } =
    $props();
</script>

<ul class="flex flex-wrap gap-1" aria-label="Roles">
  {#if owner}
    <li class="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">Owner</li>
  {/if}
  {#each names as name (name)}
    <li class="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-900">{name}</li>
  {/each}
</ul>
