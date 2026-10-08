<script lang="ts">
  import { page } from '$app/state';
  import { Collapsible } from 'bits-ui';
  import { Calendar, ChevronDown, House, Music, ShieldCheck, Star } from '@lucide/svelte';
  import type { SidebarEntry } from '../../core/performances';
  import DisplayModeToggle from './DisplayModeToggle.svelte';
  import UserMenu from './UserMenu.svelte';

  const {
    singerName,
    voicePartName,
    showAdminLink,
    performances,
  }: {
    readonly singerName: string;
    readonly voicePartName: string;
    readonly showAdminLink: boolean;
    readonly performances: readonly SidebarEntry[];
  } = $props();

  const link = (active: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${
      active
        ? 'bg-primary-100 font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-200'
        : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800/70'
    }`;

  const path = $derived(page.url.pathname);
</script>

<div class="flex h-full flex-col gap-2 p-4">
  <div class="flex items-center gap-2 px-2 py-2">
    <div class="grid size-8 place-items-center rounded-xl bg-primary-600 text-white">
      <Music size={16} aria-hidden="true" />
    </div>
    <span class="text-lg font-semibold tracking-tight">Prova</span>
  </div>

  <nav class="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
    <a href="/" class={link(path === '/')} aria-current={path === '/' ? 'page' : undefined}>
      <House size={16} aria-hidden="true" /> Home
    </a>
    {#if showAdminLink}
      <a
        href="/admin"
        class={link(path.startsWith('/admin'))}
        aria-current={path.startsWith('/admin') ? 'page' : undefined}
      >
        <ShieldCheck size={16} aria-hidden="true" /> Admin
      </a>
    {/if}

    <Collapsible.Root open class="mt-3">
      <Collapsible.Trigger
        class="group flex min-h-11 w-full items-center justify-between px-3 text-xs font-semibold tracking-wider uppercase opacity-70"
      >
        Performances
        <ChevronDown
          size={16}
          class="transition group-data-[state=closed]:-rotate-90"
          aria-hidden="true"
        />
      </Collapsible.Trigger>
      <Collapsible.Content class="flex flex-col gap-0.5">
        {#if performances.length === 0}
          <p class="px-3 text-sm opacity-70">No Performances yet.</p>
        {/if}
        <ul class="flex flex-col gap-0.5">
          {#each performances as performance (performance.id)}
            <li class={performance.archived ? 'opacity-60' : ''}>
              <!-- Opens the Performance Overview (#29), which reads this query parameter. -->
              <a href="?overview={performance.id}" class={link(false)}>
                {#if performance.isMajor}
                  <Star
                    size={16}
                    class="fill-amber-400 text-amber-500"
                    aria-label="Major Performance"
                  />
                {:else}
                  <Calendar size={16} aria-hidden="true" />
                {/if}
                <span class="flex-1 truncate">{performance.title}</span>
                {#if performance.archived}<span class="text-xs">archived</span>{/if}
              </a>
            </li>
          {/each}
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  </nav>

  <DisplayModeToggle />
  <hr class="my-2" />
  <UserMenu name={singerName} voicePart={voicePartName} />
</div>
