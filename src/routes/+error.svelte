<script lang="ts">
  // Every error a page or its load raises (a missing page, a missing Piece, no Permission) lands
  // here. It matches the fallback SvelteKit shows when the hooks themselves fail, so a Singer sees
  // the same calm screen whatever went wrong.
  import { page } from '$app/state';
  import { paths } from '../lib/core/paths';

  const message = $derived(page.error?.message ?? 'Something went wrong');
</script>

<svelte:head>
  <title>{message} · Prova</title>
</svelte:head>

<main class="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
  <div class="flex max-w-lg items-center">
    <span class="relative -top-px text-5xl leading-none font-extralight">{page.status}</span>
    <div class="ml-4 flex min-h-10 items-center border-l border-zinc-300 pl-4 dark:border-zinc-600">
      <h1 class="m-0 text-base font-normal">{message}</h1>
    </div>
  </div>
  <a
    href={paths.home}
    class="text-sm text-primary-600 underline-offset-4 hover:underline dark:text-primary-400"
  >
    Back to Home
  </a>
</main>
