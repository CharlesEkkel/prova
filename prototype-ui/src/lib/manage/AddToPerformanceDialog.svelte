<script lang="ts">
  import { Select } from 'bits-ui';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { PERFORMANCES, fmtDate, piece } from '../data.svelte';
  import Btn from '../ui/Btn.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, hint } from '../ui/styles';
  import { addPieceToPerformance, closeManage } from '../manage.svelte';
  let { pieceId }: { pieceId: string } = $props();
  // svelte-ignore state_referenced_locally (mounted fresh for each open, so props are read once on purpose)
  const p = piece(pieceId);
  const options = $derived(PERFORMANCES.filter((x) => !x.pieceIds.includes(pieceId)).map((x) => ({ value: x.id, label: `${x.title} · ${fmtDate(x.date)}` })));
  let value = $state('');
  const chosen = $derived(options.find((o) => o.value === value));
  function add() {
    if (!value) return;
    addPieceToPerformance(pieceId, value);
    closeManage();
  }
</script>

<Modal open onclose={closeManage} title="Add to a Performance" description="“{p?.title}” goes at the end of the running order.">
  {#if options.length === 0}
    <p class="text-sm text-zinc-500">It is already in every Performance.</p>
  {:else}
    <span class={fieldLabel}>Performance</span>
    <Select.Root type="single" bind:value items={options}>
      <Select.Trigger aria-label="Performance" class="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-300 bg-white px-3 text-left dark:border-zinc-700 dark:bg-zinc-950">
        <span class={chosen ? '' : 'text-zinc-500'}>{chosen?.label ?? 'Choose a Performance'}</span><ChevronDown class="size-4 text-zinc-400" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content sideOffset={6} class="z-[70] w-(--bits-select-anchor-width) rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <Select.Viewport>
            {#each options as o (o.value)}
              <Select.Item value={o.value} label={o.label} class="flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm data-highlighted:bg-zinc-100 data-selected:font-semibold dark:data-highlighted:bg-zinc-800">{o.label}</Select.Item>
            {/each}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
    <p class={hint}>Tagging a Piece to a Performance never changes the Piece itself.</p>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={closeManage}>Cancel</Btn>
    <Btn onclick={add} disabled={!value}>Add</Btn>
  {/snippet}
</Modal>
