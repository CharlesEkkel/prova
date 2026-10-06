<script lang="ts">
  // Light / Dark / System. A three-way ToggleGroup in the sidebar; `compact` is a single icon button for the
  // phone header that flips between light and dark.
  import { ToggleGroup } from 'bits-ui';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Monitor from '@lucide/svelte/icons/monitor';
  import { setTheme, theme, toggleTheme, type ThemeChoice } from '../theme.svelte';
  import Btn from './Btn.svelte';
  let { compact = false }: { compact?: boolean } = $props();
  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ] as const;
</script>

{#if compact}
  <Btn variant="ghost" size="icon" aria-label={theme.dark ? 'Switch to light mode' : 'Switch to dark mode'} onclick={toggleTheme}>
    {#if theme.dark}<Sun class="size-5" />{:else}<Moon class="size-5" />{/if}
  </Btn>
{:else}
  <ToggleGroup.Root type="single" value={theme.choice} onValueChange={(v) => v && setTheme(v as ThemeChoice)} aria-label="Light, dark or system mode" class="flex gap-1 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-800">
    {#each options as o (o.value)}
      <ToggleGroup.Item value={o.value} aria-label="{o.label} theme" class="grid h-9 flex-1 place-items-center rounded-lg text-zinc-600 transition data-[state=on]:bg-white data-[state=on]:text-violet-700 data-[state=on]:shadow-sm dark:text-zinc-400 dark:data-[state=on]:bg-zinc-950 dark:data-[state=on]:text-violet-300">
        <o.icon class="size-4" />
      </ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
{/if}
