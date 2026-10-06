<script lang="ts">
  // PROTOTYPE: the admin portal. Needs the manage-users Permission (try "Preview as role" in the user menu).
  import { Tabs } from 'bits-ui';
  import ShieldAlert from '@lucide/svelte/icons/shield-alert';
  import { can } from '$lib/access.svelte';
  import { invites, inviteStatus, members } from '$lib/admin.svelte';
  import InvitesTab from '$lib/admin/InvitesTab.svelte';
  import MembersTab from '$lib/admin/MembersTab.svelte';
  import RolesTab from '$lib/admin/RolesTab.svelte';
  import { roles } from '$lib/access.svelte';
  const pending = $derived(members.filter((m) => m.pending).length);
  const live = $derived(invites.filter((i) => inviteStatus(i) === 'active').length);
  const tab = 'inline-flex min-h-11 shrink-0 whitespace-nowrap items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-zinc-500 data-[state=active]:border-violet-600 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300';
  const count = 'rounded-full bg-zinc-200 px-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Admin</h1>
  <p class="text-zinc-500">Members, Roles and Invite Links.</p>

  {#if !can('manage-users')}
    <div class="mt-8 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
      <ShieldAlert class="size-8 text-zinc-400" />
      <p class="font-semibold">You need the Manage users Permission</p>
      <p class="max-w-sm text-sm text-zinc-500">Only Admins can approve sign-ups, assign Roles and create Invite Links.</p>
    </div>
  {:else}
    <Tabs.Root value="members" class="mt-6">
      <Tabs.List class="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        <Tabs.Trigger value="members" class={tab}>Members {#if pending}<span class="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">{pending} pending</span>{/if}</Tabs.Trigger>
        <Tabs.Trigger value="roles" class={tab}>Roles <span class={count}>{roles.length}</span></Tabs.Trigger>
        <Tabs.Trigger value="invites" class={tab}>Invite links <span class={count}>{live}</span></Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="members" class="pt-6"><MembersTab /></Tabs.Content>
      <Tabs.Content value="roles" class="pt-6"><RolesTab /></Tabs.Content>
      <Tabs.Content value="invites" class="pt-6"><InvitesTab /></Tabs.Content>
    </Tabs.Root>
  {/if}
</div>
