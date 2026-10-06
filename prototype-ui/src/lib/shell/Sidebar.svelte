<script lang="ts">
  import { Avatar, Collapsible, DropdownMenu, Separator } from 'bits-ui';
  import { page } from '$app/state';
  import House from '@lucide/svelte/icons/house';
  import Search from '@lucide/svelte/icons/search';
  import Music from '@lucide/svelte/icons/music';
  import Calendar from '@lucide/svelte/icons/calendar';
  import ListMusic from '@lucide/svelte/icons/list-music';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Star from '@lucide/svelte/icons/star';
  import { SINGER, fmtDate, past, upcoming } from '../data.svelte';
  import { openOverview, ui } from '../ui.svelte';

  const path = $derived(page.url.pathname);
  const link = (active: boolean) =>
    `flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${active ? 'bg-violet-100 font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-200' : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/70'}`;
  const trigger = 'group flex w-full min-h-9 items-center justify-between px-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase';
</script>

<div class="flex h-full flex-col gap-2 p-4">
  <div class="flex items-center gap-2 px-2 py-2">
    <div class="grid size-8 place-items-center rounded-xl bg-violet-600 text-white"><Music class="size-4" /></div>
    <span class="text-lg font-semibold tracking-tight">Prova</span>
  </div>

  <button onclick={() => (ui.search = true)} class="flex min-h-10 items-center gap-3 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900">
    <Search class="size-4" /> Search <kbd class="ml-auto rounded bg-zinc-200 px-1.5 text-[10px] dark:bg-zinc-800">Ctrl K</kbd>
  </button>

  <nav class="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
    <a href="/" class={link(path === '/')}><House class="size-4" /> Home</a>
    <a href="/repertoire" class={link(path === '/repertoire' || path.startsWith('/piece'))}><ListMusic class="size-4" /> Repertoire</a>

    <Collapsible.Root open class="mt-3">
      <Collapsible.Trigger class={trigger}>Performances <ChevronDown class="size-4 transition group-data-[state=closed]:-rotate-90" /></Collapsible.Trigger>
      <Collapsible.Content class="flex flex-col gap-0.5">
        {#each upcoming() as p (p.id)}
          <button onclick={() => openOverview(p.id)} class="{link(path === `/perform/${p.id}`)} w-full text-left">
            {#if p.major}<Star class="size-4 fill-amber-400 text-amber-500" />{:else}<Calendar class="size-4" />{/if}
            <span class="flex-1 truncate">{p.title}</span><span class="text-xs text-zinc-500">{fmtDate(p.date).split(' ').slice(1).join(' ')}</span>
          </button>
        {/each}
        {#each past() as p (p.id)}
          <button onclick={() => openOverview(p.id)} class="{link(path === `/perform/${p.id}`)} w-full text-left opacity-60"><Calendar class="size-4" /><span class="flex-1 truncate">{p.title}</span><span class="text-xs">archived</span></button>
        {/each}
      </Collapsible.Content>
    </Collapsible.Root>
  </nav>

  <Separator.Root class="my-2 h-px bg-zinc-200 dark:bg-zinc-800" />
  <DropdownMenu.Root>
    <DropdownMenu.Trigger class="flex items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70">
      <Avatar.Root class="size-9 shrink-0 overflow-hidden rounded-full bg-violet-200 text-violet-800">
        <Avatar.Fallback class="grid size-full place-items-center text-sm font-semibold">{SINGER.name[0]}</Avatar.Fallback>
      </Avatar.Root>
      <span class="min-w-0 flex-1"><span class="block text-sm font-medium">{SINGER.name}</span><span class="block text-xs text-zinc-500">Voice Part: {SINGER.part}</span></span>
      <ChevronDown class="size-4 text-zinc-500" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content side="top" align="start" sideOffset={8} class="z-50 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <DropdownMenu.Item class="rounded-lg px-3 py-2 text-sm data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800">Change default Voice Part</DropdownMenu.Item>
        <DropdownMenu.Item class="rounded-lg px-3 py-2 text-sm data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800">Sign out</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
</div>
