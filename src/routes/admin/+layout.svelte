<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';

  const { children }: { readonly children: Snippet } = $props();

  const tabs = [
    { href: '/admin', label: 'Singers' },
    { href: '/admin/roles', label: 'Roles' },
  ] as const;
</script>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
  <header class="flex items-center justify-between gap-4">
    <h1 class="text-2xl font-semibold">Admin</h1>
    <a class="text-sm underline" href="/">Back to Prova</a>
  </header>

  <nav class="flex gap-2 border-b" aria-label="Admin sections">
    {#each tabs as tab (tab.href)}
      <a
        href={tab.href}
        class="min-h-11 px-4 py-2 font-medium aria-[current=page]:border-b-2 aria-[current=page]:border-emerald-700"
        aria-current={page.url.pathname === tab.href ? 'page' : undefined}>{tab.label}</a
      >
    {/each}
  </nav>

  {@render children()}
</main>
