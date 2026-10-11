<script lang="ts">
  // Every error a page or its load raises (a missing page, a missing Piece, no Permission) lands
  // here. src/error.html covers the rest (the hooks, file links); keep the two looking the same, so
  // a Singer sees one calm screen whatever went wrong. The link stays neutral because that page
  // cannot know the Colour Theme.
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
    class="text-sm text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
  >
    Back to Home
  </a>
</main>
