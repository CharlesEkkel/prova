<script lang="ts">
  // Colour theme: a row of swatches, each showing the gradient that theme's hero runs between.
  import { RadioGroup } from 'bits-ui';
  import Check from '@lucide/svelte/icons/check';
  import { ACCENTS, setAccent, theme, type Accent } from '../theme.svelte';
</script>

<div>
  <p class="mb-1.5 flex items-baseline justify-between px-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Colour <span class="font-medium tracking-normal normal-case">{ACCENTS.find((a) => a.id === theme.accent)?.label}</span></p>
  <RadioGroup.Root value={theme.accent} onValueChange={(v) => setAccent(v as Accent)} aria-label="Colour theme" class="flex justify-between gap-1">
    {#each ACCENTS as a (a.id)}
      <RadioGroup.Item value={a.id} aria-label="{a.label} colour theme" title={a.label} class="group grid size-9 place-items-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-zinc-100 transition shadow-[inset_0_0_0_1px_rgba(128,128,128,0.4)] hover:scale-110 data-[state=checked]:ring-zinc-900 dark:ring-offset-zinc-900 dark:data-[state=checked]:ring-zinc-100" style="background: linear-gradient(135deg, {a.from}, {a.to})">
        <Check class="size-4 text-white opacity-0 drop-shadow transition group-data-[state=checked]:opacity-100" />
      </RadioGroup.Item>
    {/each}
  </RadioGroup.Root>
</div>
