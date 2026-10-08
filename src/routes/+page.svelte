<script lang="ts">
  import { onMount } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { Moon, Sun } from '@lucide/svelte';
  import { signOutPath } from '../lib/core/gate';
  import { getDisplayMode, setDisplayMode } from '../lib/shell/display-mode-adapter';
  import type { DisplayMode } from '../lib/shell/display-mode';

  let mode = $state<DisplayMode>('system');

  onMount(async () => {
    mode = await getDisplayMode();
  });

  const choose = async (next: DisplayMode) => {
    mode = next;
    await setDisplayMode(next);
  };
</script>

<main class="mx-auto flex max-w-xl flex-col gap-4 p-6">
  <h1 class="text-2xl font-semibold">Prova</h1>

  <div class="flex gap-2" role="group" aria-label="Display Mode">
    <button
      class="flex items-center gap-1 rounded border px-3 py-1"
      aria-pressed={mode === 'light'}
      onclick={() => choose('light')}><Sun size={16} /> Light</button
    >
    <button
      class="flex items-center gap-1 rounded border px-3 py-1"
      aria-pressed={mode === 'dark'}
      onclick={() => choose('dark')}><Moon size={16} /> Dark</button
    >
    <button
      class="rounded border px-3 py-1"
      aria-pressed={mode === 'system'}
      onclick={() => choose('system')}>System</button
    >
  </div>

  <Dialog.Root>
    <Dialog.Trigger
      class="w-fit rounded bg-slate-900 px-3 py-1 text-white dark:bg-slate-100 dark:text-slate-900"
    >
      Open dialog
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay class="fixed inset-0 bg-black/50" />
      <Dialog.Content
        class="fixed top-1/2 left-1/2 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 text-slate-900 shadow-lg dark:bg-slate-800 dark:text-slate-100"
      >
        <Dialog.Title class="text-lg font-semibold">Dialog</Dialog.Title>
        <Dialog.Description class="text-sm opacity-80">
          A Bits UI component, themed for light and dark.
        </Dialog.Description>
        <Dialog.Close class="mt-4 rounded border px-3 py-1">Close</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>

  <!-- Until the app shell (#30) puts Sign out in the user menu. -->
  <form method="POST" action={signOutPath}>
    <button class="w-fit rounded border px-3 py-1">Sign out</button>
  </form>
</main>
