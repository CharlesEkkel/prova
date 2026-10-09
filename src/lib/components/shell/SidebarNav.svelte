<script lang="ts">
  import { page } from '$app/state';
  import { Collapsible } from 'bits-ui';
  import { Calendar, ChevronDown, House, Library, ShieldCheck, Star } from '@lucide/svelte';
  import { isActive, mainNavigation, type NavItem } from '../../core/navigation';
  import { overviewLink } from '../../core/paths';
  import type { ShellData } from '../../core/shell';
  import Logo from '../ui/Logo.svelte';
  import DisplayModeToggle from './DisplayModeToggle.svelte';
  import UserMenu from './UserMenu.svelte';

  const { shell }: { readonly shell: ShellData } = $props();

  const link = (active: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${
      active
        ? 'bg-primary-100 font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-200'
        : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
    }`;

  const iconFor = (key: NavItem['key']) => {
    if (key === 'admin') return ShieldCheck;
    return key === 'repertoire' ? Library : House;
  };

  const path = $derived(page.url.pathname);
</script>

<div class="flex h-full flex-col gap-2 p-4">
  <div class="flex items-center gap-2 px-2 py-2">
    <Logo />
    <span class="text-lg font-semibold tracking-tight">Prova</span>
  </div>

  <nav class="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
    {#each mainNavigation(shell.showAdminLink) as item (item.key)}
      {@const Icon = iconFor(item.key)}
      <a
        href={item.path}
        class={link(isActive(item, path))}
        aria-current={isActive(item, path) ? 'page' : undefined}
      >
        <Icon size={16} aria-hidden="true" />
        {item.label}
      </a>
    {/each}

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
        {#if shell.performances.length === 0}
          <p class="px-3 text-sm opacity-70">No Performances yet.</p>
        {/if}
        <ul class="flex flex-col gap-0.5">
          {#each shell.performances as performance (performance.id)}
            <li class={performance.archived ? 'opacity-60' : ''}>
              <!-- Opens the Performance Overview (#29), which reads this query parameter. -->
              <a href={overviewLink(performance.id)} class={link(false)}>
                {#if performance.isMajor}
                  <Star
                    size={16}
                    class="fill-amber-400 text-amber-500"
                    role="img"
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
  <UserMenu name={shell.singerName} voicePart={shell.voicePartName} />
</div>
