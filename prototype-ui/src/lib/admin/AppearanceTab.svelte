<script lang="ts">
  // The colour theme is one site-wide choice for everyone (light/dark stays personal). The app behind this
  // page recolours live as you pick.
  import { RadioGroup } from 'bits-ui';
  import Check from '@lucide/svelte/icons/check';
  import Globe from '@lucide/svelte/icons/globe';
  import { ACCENTS, DEFAULT_ACCENT, setSiteAccent, site, type Accent } from '../theme.svelte';
  import Btn from '../ui/Btn.svelte';
</script>

<div class="flex flex-col gap-4">
  <p class="flex max-w-prose items-start gap-2 text-sm text-zinc-500">
    <Globe class="mt-0.5 size-4 shrink-0" />
    The colour theme applies to everyone in the choir. Each person still chooses light or dark for themselves.
  </p>

  <RadioGroup.Root value={site.accent} onValueChange={(v) => setSiteAccent(v as Accent)} aria-label="Colour theme for everyone" class="grid gap-3 sm:grid-cols-2">
    {#each ACCENTS as a (a.id)}
      <RadioGroup.Item value={a.id} aria-label="{a.label} colour theme" class="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 data-[state=checked]:border-violet-600 data-[state=checked]:ring-2 data-[state=checked]:ring-violet-600/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
        <span class="grid size-14 shrink-0 place-items-center rounded-xl shadow-[inset_0_0_0_1px_rgba(128,128,128,0.3)]" style="background: linear-gradient(135deg, {a.from}, {a.to})">
          <Check class="size-5 text-white opacity-0 drop-shadow transition group-data-[state=checked]:opacity-100" />
        </span>
        <span class="min-w-0 flex-1">
          <b class="flex items-center gap-2">{a.label}{#if a.id === DEFAULT_ACCENT}<span class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Default</span>{/if}</b>
          <span class="text-sm text-zinc-500">{a.blurb}</span>
        </span>
      </RadioGroup.Item>
    {/each}
  </RadioGroup.Root>

  {#if site.accent !== DEFAULT_ACCENT}
    <Btn variant="ghost" size="sm" class="self-start" onclick={() => setSiteAccent(DEFAULT_ACCENT)}>Reset to the default</Btn>
  {/if}
</div>
