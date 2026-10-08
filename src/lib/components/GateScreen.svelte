<script lang="ts">
  import type { Snippet } from 'svelte';

  const { title, children }: { readonly title: string; readonly children: Snippet } = $props();
</script>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
  <p class="text-sm font-semibold tracking-wide text-primary-700 uppercase dark:text-primary-400">
    Prova
  </p>
  <h1 class="text-2xl font-semibold">{title}</h1>
  {@render children()}
</main>
