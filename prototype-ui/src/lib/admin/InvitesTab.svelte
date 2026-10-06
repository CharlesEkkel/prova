<script lang="ts">
  // Invite Links grant a fixed set of Roles to anyone who signs up through them. Revocable, with an optional
  // expiry and use cap, and never able to grant `delete` or `manage-users`.
  import { AlertDialog, Select } from 'bits-ui';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import Link from '@lucide/svelte/icons/link';
  import Plus from '@lucide/svelte/icons/plus';
  import UserX from '@lucide/svelte/icons/user-x';
  import { grantableByLink } from '../access.svelte';
  import { createInvite, inviteStatus, inviteUrl, invites, revokeInvite, type Invite } from '../admin.svelte';
  import { fmtDate } from '../data.svelte';
  import type { Action } from '../actions';
  import Btn from '../ui/Btn.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import Modal from '../ui/Modal.svelte';
  import { errorText, fieldLabel, hint, input } from '../ui/styles';
  import RoleChips from './RoleChips.svelte';
  import RolePicker from './RolePicker.svelte';

  const expiries = [
    { value: 'never', label: 'Never expires', days: null },
    { value: '1', label: 'In 1 day', days: 1 },
    { value: '7', label: 'In 7 days', days: 7 },
    { value: '30', label: 'In 30 days', days: 30 }
  ];
  let creating = $state(false);
  let label = $state('');
  let picked = $state<string[]>(['reader']);
  let expiry = $state('7');
  let cap = $state('');
  let revoking = $state<Invite | null>(null);
  let copied = $state<string | null>(null);

  const capNum = $derived(cap.trim() === '' ? null : Number(cap));
  const capBad = $derived(capNum !== null && (!Number.isInteger(capNum) || capNum < 1));
  const valid = $derived(label.trim() !== '' && picked.length > 0 && !capBad);
  function openCreate() {
    creating = true;
    label = '';
    picked = ['reader'];
    expiry = '7';
    cap = '';
  }
  function create() {
    if (!valid) return;
    createInvite(label.trim(), picked, expiries.find((e) => e.value === expiry)?.days ?? null, capNum);
    creating = false;
  }
  async function copy(i: Invite) {
    try {
      await navigator.clipboard.writeText(`https://${inviteUrl(i)}`);
    } catch {
      /* clipboard can be blocked; the prototype still shows the confirmation */
    }
    copied = i.id;
    setTimeout(() => (copied = null), 1500);
  }
  const actions = (i: Invite): Action[] => [
    { key: 'copy', label: 'Copy link', icon: Copy, run: () => copy(i) },
    ...(inviteStatus(i) === 'active' ? [{ key: 'revoke', label: 'Revoke link…', icon: UserX, danger: true, run: () => (revoking = i) }] : [])
  ];
  const badge: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    revoked: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    expired: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
    'used up': 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
  };
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-start justify-between gap-3">
    <p class="max-w-prose text-sm text-zinc-500">Share a link and anyone who signs up through it gets its Roles straight away, no approval needed.</p>
    <Btn size="sm" variant="soft" onclick={openCreate}><Plus class="size-4" /> New link</Btn>
  </div>

  <ul class="flex flex-col gap-2">
    {#each invites as i (i.id)}
      {@const status = inviteStatus(i)}
      <li class="pr-1">
        <ManageMenu actions={actions(i)} label="Actions for {i.label} link" class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 {status === 'active' ? '' : 'opacity-70'}">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-2 font-semibold">{i.label}<span class="rounded-full px-2 py-0.5 text-xs font-semibold {badge[status]}">{status}</span></p>
              <p class="mt-0.5 flex items-center gap-1.5 truncate text-sm text-zinc-500"><Link class="size-3.5 shrink-0" />{inviteUrl(i)}</p>
              <p class="mt-1 text-xs text-zinc-500">{i.used}{i.cap !== null ? ` of ${i.cap}` : ''} used · {i.expires ? `expires ${fmtDate(i.expires)}` : 'never expires'}</p>
            </div>
            <RoleChips roleIds={i.roleIds} />
            <Btn size="sm" variant="outline" onclick={() => copy(i)} aria-label="Copy {i.label} link">{#if copied === i.id}<Check class="size-4 text-emerald-600" /> Copied{:else}<Copy class="size-4" /> Copy{/if}</Btn>
          </div>
        </ManageMenu>
      </li>
    {/each}
  </ul>
</div>

{#if creating}
  <Modal open onclose={() => (creating = false)} title="New Invite Link" description="Everyone who joins through it gets the Roles you choose.">
    <div class="flex flex-col gap-5">
      <div>
        <label for="inv-label" class={fieldLabel}>Label</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input id="inv-label" class={input} bind:value={label} placeholder="e.g. Spring intake" autofocus />
        <p class={hint}>Only you see this. It helps you tell links apart.</p>
      </div>
      <div>
        <span class={fieldLabel}>Roles it grants</span>
        <RolePicker bind:value={picked} idPrefix="inv" blocked={(r) => (grantableByLink(r) ? null : "Can't be granted by a link")} />
        {#if picked.length === 0}<p class={errorText}>Pick at least one Role.</p>{/if}
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <span class={fieldLabel}>Expires</span>
          <Select.Root type="single" bind:value={expiry} items={expiries}>
            <Select.Trigger aria-label="Expiry" class="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-300 bg-white px-3 text-left dark:border-zinc-700 dark:bg-zinc-950">{expiries.find((e) => e.value === expiry)?.label}<ChevronDown class="size-4 text-zinc-400" /></Select.Trigger>
            <Select.Portal>
              <Select.Content sideOffset={6} class="z-[70] w-(--bits-select-anchor-width) rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                <Select.Viewport>{#each expiries as e (e.value)}<Select.Item value={e.value} label={e.label} class="flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm data-highlighted:bg-zinc-100 data-selected:font-semibold dark:data-highlighted:bg-zinc-800">{e.label}</Select.Item>{/each}</Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div>
          <label for="inv-cap" class={fieldLabel}>Use cap</label>
          <input id="inv-cap" class={input} bind:value={cap} inputmode="numeric" placeholder="Unlimited" />
          {#if capBad}<p class={errorText}>Enter a whole number, or leave it blank.</p>{/if}
        </div>
      </div>
    </div>
    {#snippet footer()}
      <Btn variant="ghost" onclick={() => (creating = false)}>Cancel</Btn>
      <Btn disabled={!valid} onclick={create}>Create link</Btn>
    {/snippet}
  </Modal>
{/if}

{#if revoking}
  {@const i = revoking}
  <Modal open alert onclose={() => (revoking = null)} title="Revoke “{i.label}”?" description="The link stops working immediately.">
    <p class="text-sm text-zinc-600 dark:text-zinc-400">People who already joined through it keep their access. Nobody new can join with it.</p>
    {#snippet footer()}
      <AlertDialog.Cancel class="inline-flex h-11 items-center rounded-full px-5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => { revokeInvite(i.id); revoking = null; }} class="inline-flex h-11 items-center rounded-full bg-red-600 px-5 font-medium text-white hover:bg-red-500">Revoke link</AlertDialog.Action>
    {/snippet}
  </Modal>
{/if}
