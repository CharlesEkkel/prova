<script lang="ts">
  import { Label, Switch } from 'bits-ui';
  import { options } from '../player.svelte';
  const rows = [
    { key: 'skipEmpty', label: 'Skip Pieces with no Practice Tracks' },
    { key: 'preferCombined', label: 'Prefer Combined Tracks' }
  ] as const;
</script>

<div class="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
  {#each rows as r (r.key)}
    <div class="flex items-center justify-between gap-4 py-3">
      <Label.Root for="opt-{r.key}" class="flex-1 text-sm">{r.label}</Label.Root>
      <Switch.Root id="opt-{r.key}" bind:checked={options[r.key]} class="inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-zinc-300 transition data-[state=checked]:bg-violet-600 dark:bg-zinc-700">
        <Switch.Thumb class="block size-6 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  {/each}
</div>
