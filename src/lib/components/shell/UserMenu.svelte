<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import { ChevronDown } from '@lucide/svelte';
  import { signOutPath } from '../../core/gate';
  import PersonAvatar from '../ui/PersonAvatar.svelte';
  import { menuEntry, menuPanel } from '../ui/styles';

  const { name, voicePart }: { readonly name: string; readonly voicePart: string } = $props();

  let signOutForm = $state<HTMLFormElement | null>(null);
</script>

<form method="POST" action={signOutPath} bind:this={signOutForm} class="hidden"></form>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="flex min-h-11 w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70"
    aria-label="User menu for {name}"
  >
    <PersonAvatar {name} size="sm" />
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
      class="z-50 w-56 text-zinc-900 dark:text-zinc-100 {menuPanel}"
    >
      <!-- "Change default Voice Part" is added by #16. -->
      <DropdownMenu.Item
        class={menuEntry}
        onSelect={() => {
          signOutForm?.requestSubmit();
        }}>Sign out</DropdownMenu.Item
      >
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
