<script lang="ts">
  import { Monitor, Moon, Sun } from '@lucide/svelte';
  import type { DisplayMode } from '../../shell/display-mode';
  import { displayMode } from '../display-mode.svelte';

  /** Compact is the phone header's single button, which flips between light and dark. */
  const { compact = false }: { readonly compact?: boolean } = $props();

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const satisfies readonly { value: DisplayMode; label: string; icon: typeof Sun }[];
</script>

{#if compact}
  <button
    class="grid size-11 place-items-center rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800"
    aria-label={displayMode.dark ? 'Switch to light mode' : 'Switch to dark mode'}
    onclick={() => displayMode.choose(displayMode.dark ? 'light' : 'dark')}
  >
    {#if displayMode.dark}<Sun size={20} />{:else}<Moon size={20} />{/if}
  </button>
{:else}
  <div
    class="flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"
    role="group"
    aria-label="Display Mode"
  >
    {#each options as option (option.value)}
      <button
        class="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg text-sm text-slate-600 aria-pressed:bg-white aria-pressed:font-medium aria-pressed:text-primary-700 aria-pressed:shadow-sm dark:text-slate-400 dark:aria-pressed:bg-slate-950 dark:aria-pressed:text-primary-300"
        aria-pressed={displayMode.mode === option.value}
        aria-label={option.label}
        title={option.label}
        onclick={() => displayMode.choose(option.value)}
      >
        <option.icon size={16} aria-hidden="true" />
      </button>
    {/each}
  </div>
{/if}
