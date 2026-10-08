<script lang="ts">
  import { ToggleGroup } from 'bits-ui';
  import { Monitor, Moon, Sun } from '@lucide/svelte';
  import { isDisplayMode } from '../../shell/display-mode';
  import { displayMode } from '../display-mode.svelte';
  import Btn from '../ui/Btn.svelte';

  /** Compact is the phone header's single button, which flips between light and dark. */
  const { compact = false }: { readonly compact?: boolean } = $props();

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;
</script>

{#if compact}
  <!-- Both icons are drawn and CSS picks one from the page's mode, so a dark page never flashes the wrong icon. -->
  <Btn
    variant="ghost"
    size="icon"
    aria-label={displayMode.dark ? 'Switch to light mode' : 'Switch to dark mode'}
    onclick={() => displayMode.choose(displayMode.dark ? 'light' : 'dark')}
  >
    <Moon size={20} class="dark:hidden" />
    <Sun size={20} class="hidden dark:block" />
  </Btn>
{:else}
  <ToggleGroup.Root
    type="single"
    value={displayMode.mode}
    onValueChange={(next: string) => {
      // Pressing the chosen one again would clear it; there is always a Display Mode.
      if (isDisplayMode(next)) void displayMode.choose(next);
    }}
    aria-label="Display Mode"
    class="flex gap-1 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-800"
  >
    {#each options as option (option.value)}
      <ToggleGroup.Item
        value={option.value}
        aria-label={option.label}
        title={option.label}
        class="grid min-h-11 flex-1 place-items-center rounded-lg text-zinc-600 transition data-[state=on]:bg-white data-[state=on]:text-primary-700 data-[state=on]:shadow-sm dark:text-zinc-400 dark:data-[state=on]:bg-zinc-950 dark:data-[state=on]:text-primary-300"
      >
        <option.icon size={16} aria-hidden="true" />
      </ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
{/if}
