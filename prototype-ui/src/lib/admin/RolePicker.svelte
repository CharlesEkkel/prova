<script lang="ts">
  // A checkbox list of Roles. `blocked` returns a reason a Role cannot be chosen (shown, and the box is disabled).
  import { Checkbox, Label } from 'bits-ui';
  import Check from '@lucide/svelte/icons/check';
  import { roles, type Role } from '../access.svelte';
  let { value = $bindable([]), blocked, idPrefix = 'role' }: { value?: string[]; blocked?: (r: Role) => string | null; idPrefix?: string } = $props();
  const toggle = (id: string, on: boolean) => (value = on ? [...value, id] : value.filter((x) => x !== id));
</script>

<ul class="flex flex-col gap-1">
  {#each roles as r (r.id)}
    {@const why = blocked?.(r) ?? null}
    <li class="flex items-start gap-3 rounded-xl px-2 py-2 {why ? 'opacity-60' : ''}">
      <Checkbox.Root id="{idPrefix}-{r.id}" checked={value.includes(r.id)} onCheckedChange={(c) => toggle(r.id, c)} disabled={why !== null} class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-zinc-400 data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600 dark:border-zinc-600">
        {#snippet children({ checked })}{#if checked}<Check class="size-4 text-white" />{/if}{/snippet}
      </Checkbox.Root>
      <Label.Root for="{idPrefix}-{r.id}" class="text-sm"><b class="block">{r.name}</b><span class="text-zinc-500">{why ?? r.permissions.join(', ')}</span></Label.Root>
    </li>
  {/each}
</ul>
