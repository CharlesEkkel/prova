<script lang="ts">
  import { Avatar, DropdownMenu } from 'bits-ui';
  import { ChevronDown } from '@lucide/svelte';
  import { signOutPath } from '../../core/gate';

  const { name, voicePart }: { readonly name: string; readonly voicePart: string } = $props();

  let signOutForm = $state<HTMLFormElement | null>(null);

  const item =
    'flex min-h-11 items-center rounded-lg px-3 text-sm outline-none data-disabled:opacity-60 data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800';
</script>

<form method="POST" action={signOutPath} bind:this={signOutForm} class="hidden"></form>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="flex min-h-11 w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70"
    aria-label="User menu for {name}"
  >
    <Avatar.Root
      class="size-9 shrink-0 overflow-hidden rounded-full bg-primary-200 text-primary-800"
    >
      <Avatar.Fallback class="grid size-full place-items-center text-sm font-semibold">
        {name.slice(0, 1).toUpperCase()}
      </Avatar.Fallback>
    </Avatar.Root>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-medium">{name}</span>
      <span class="block truncate text-xs text-zinc-500">Voice Part: {voicePart}</span>
    </span>
    <ChevronDown size={16} class="text-zinc-500" aria-hidden="true" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      side="top"
      align="start"
      sideOffset={8}
      class="z-50 w-56 rounded-xl border bg-white p-1 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100"
    >
      <!-- "Change default Voice Part" is added by #16. -->
      <DropdownMenu.Item
        class={item}
        onSelect={() => {
          signOutForm?.requestSubmit();
        }}>Sign out</DropdownMenu.Item
      >
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
