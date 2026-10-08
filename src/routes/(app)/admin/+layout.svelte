<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { isPendingSinger } from '../../../lib/core/admin-rules';
  import { adminTabs, isActive } from '../../../lib/core/navigation';
  import type { LayoutData } from './$types';

  const { data, children }: { readonly data: LayoutData; readonly children: Snippet } = $props();

  const pendingCount = $derived(
    data.singers.filter((singer) => isPendingSinger(singer.permissions)).length,
  );

  const tab =
    'inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium whitespace-nowrap text-zinc-500 aria-[current=page]:border-primary-600 aria-[current=page]:text-primary-700 dark:aria-[current=page]:text-primary-300';
  const count =
    'rounded-full bg-zinc-200 px-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Admin</h1>
  <p class="text-zinc-500">Singers, Roles and the Colour Theme.</p>

  <nav class="mt-6 flex overflow-x-auto border-b" aria-label="Admin sections">
    {#each adminTabs as item (item.key)}
      <a
        href={item.path}
        class={tab}
        aria-current={isActive(item, page.url.pathname) ? 'page' : undefined}
      >
        {item.label}
        {#if item.key === 'admin-singers' && pendingCount > 0}
          <span
            class="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800"
            aria-label="{pendingCount.toString()} pending">{pendingCount} pending</span
          >
        {:else if item.key === 'admin-roles'}
          <span class={count}>{data.roles.length}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="pt-6">{@render children()}</div>
</div>
