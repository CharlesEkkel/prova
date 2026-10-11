<script lang="ts">
  import { enhance } from '$app/forms';
  import { Check } from '@lucide/svelte';
  import AlertMessage from '../../../../lib/components/AlertMessage.svelte';
  import Btn from '../../../../lib/components/ui/Btn.svelte';
  import { card, fieldLabel, hint, input } from '../../../../lib/components/ui/styles';
  import {
    colourThemeLabels,
    colourThemes,
    defaultColourTheme,
    type ColourTheme,
    themeColours,
  } from '../../../../lib/core/colour-theme';
  import { actionPath, formActions } from '../../../../lib/core/paths';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  const gradientOf = (theme: ColourTheme): string => {
    const { background_color, theme_color } = themeColours(theme);
    return `linear-gradient(135deg, ${background_color}, ${theme_color})`;
  };
</script>

{#if form !== null && 'problem' in form}
  <div class="mb-4"><AlertMessage>{form.problem}</AlertMessage></div>
{/if}

<div class="flex flex-col gap-4">
  <p class="max-w-prose text-sm text-zinc-500">
    The Colour Theme is the palette everyone sees, including people who have not signed in. You see
    a change at once; everyone else picks it up within an hour.
  </p>

  <form method="POST" action={actionPath(formActions.appearance.set)} use:enhance>
    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {#each colourThemes as theme (theme)}
        {@const chosen = theme === data.colourTheme}
        <li>
          <button
            type="submit"
            name="theme"
            value={theme}
            aria-pressed={chosen}
            data-testid="colour-theme"
            class="{card} flex w-full flex-col gap-3 p-3 text-left outline-none focus-visible:outline-2 {chosen
              ? 'border-primary-600 ring-2 ring-primary-600/30'
              : ''}"
          >
            <span
              class="block h-16 rounded-xl border"
              style:background={gradientOf(theme)}
              aria-hidden="true"
            ></span>
            <span class="flex items-center justify-between gap-2 text-sm font-medium">
              <span>
                {colourThemeLabels[theme]}
                {#if theme === defaultColourTheme}
                  <span class="ml-1 text-xs font-normal text-zinc-500">Default</span>
                {/if}
              </span>
              {#if chosen}
                <Check class="size-4 text-primary-700 dark:text-primary-300" aria-label="Current" />
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </form>

  <form method="POST" action={actionPath(formActions.appearance.reset)} use:enhance>
    <Btn
      type="submit"
      variant="outline"
      size="sm"
      disabled={data.colourTheme === defaultColourTheme}>Reset to the default</Btn
    >
  </form>

  <form
    method="POST"
    action={actionPath(formActions.appearance.timeZone)}
    use:enhance={() =>
      async ({ update }) => {
        await update({ reset: false });
      }}
    class="mt-6 flex flex-col gap-2"
  >
    <label for="choir-time-zone" class={fieldLabel}>Choir Time Zone</label>
    <div class="flex flex-wrap items-center gap-2">
      <select id="choir-time-zone" name="zone" class="{input} max-w-xs" value={data.choirTimeZone}>
        {#each data.choirTimeZones as zone (zone)}
          <option value={zone}>{zone.replaceAll('_', ' ')}</option>
        {/each}
      </select>
      <Btn type="submit" variant="outline" size="sm">Save time zone</Btn>
    </div>
    <p class={hint}>
      Every Performance time is entered and shown in this zone, whatever a Singer’s device says.
      Changing it moves no Performance; it changes how their times read.
    </p>
  </form>
</div>
