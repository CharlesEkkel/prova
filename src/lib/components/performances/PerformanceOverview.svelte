<script lang="ts">
  // The Performance Overview: opened by `?overview=<id>` on any page, it lists the Performance's
  // Pieces in running order. A Singer with `update` can drag them into a new order or remove one, and
  // edit the Performance; one with `delete` can delete it. The Play-through options and the Play
  // button are added on top of this by #29.
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Dialog } from 'bits-ui';
  import { ChevronRight, Trash, X } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action';
  import type { ChoirTimeZone } from '../../core/choir-time';
  import { formActions, performanceActionPath, piecePath, withoutOverview } from '../../core/paths';
  import {
    performanceWhen,
    type PerformanceAction,
    type PieceRowAction,
  } from '../../core/performances';
  import { submitPerformanceForm, type PerformanceFormOutcome } from '../../shell/enhance';
  import type { PieceSummary } from '../../core/pieces';
  import type { PerformanceOverview } from '../../shell/performances';
  import AlertMessage from '../AlertMessage.svelte';
  import MajorBadge from '../ui/MajorBadge.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import PerformanceManageMenu from './PerformanceManageMenu.svelte';

  const {
    overview,
    choirTimeZone,
    actions,
    rowActions,
    mayChangeOrder,
  }: {
    /** The Performance whose Overview is open, or null when none is. */
    readonly overview: PerformanceOverview | null;
    readonly choirTimeZone: ChoirTimeZone;
    readonly actions: readonly PerformanceAction[];
    readonly rowActions: readonly PieceRowAction[];
    /** Whether the Pieces can be dragged into a new order. */
    readonly mayChangeOrder: boolean;
  } = $props();

  const close = () => goto(withoutOverview(page.url), { reset: false });

  // A refusal of a move or a removal, shown above the list.
  let problem = $state<string | undefined>(undefined);

  // The order shown follows the server's, except while dragging and until the new order is saved.
  let items = $derived(overview?.pieces ?? []);
  const flipDurationMs = 150;
  let reorderForm = $state<HTMLFormElement | null>(null);
  let removeForm = $state<HTMLFormElement | null>(null);
  let removing = $state<PieceSummary | null>(null);

  const onConsider = (event: CustomEvent<DndEvent<PieceSummary>>) => {
    items = event.detail.items;
  };

  const onFinalize = async (event: CustomEvent<DndEvent<PieceSummary>>) => {
    items = event.detail.items;
    // Wait for the form's hidden fields to show the dropped order before sending them.
    await tick();
    reorderForm?.requestSubmit();
  };

  const rowMenu = (piece: PieceSummary) =>
    rowActions.includes('remove')
      ? [
          {
            key: 'remove',
            label: 'Remove from this Performance',
            icon: Trash,
            danger: true,
            run: async () => {
              removing = piece;
              await tick();
              removeForm?.requestSubmit();
            },
          },
        ]
      : [];

  const showProblem = (outcome: PerformanceFormOutcome) => {
    problem = outcome.ok ? undefined : outcome.problem;
    // A refused move shows the order the server has now, which the page has just reloaded.
    if (!outcome.ok) items = overview?.pieces ?? [];
  };

  const description = $derived(
    overview === null
      ? ''
      : [
          performanceWhen(overview.startsAt, overview.endsAt, choirTimeZone),
          ...(overview.venue === '' ? [] : [overview.venue]),
        ].join(' · '),
  );
</script>

<Dialog.Root
  open={overview !== null}
  onOpenChange={(next) => {
    if (!next) void close();
  }}
>
  <Dialog.Portal>
    {#if overview !== null}
      <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <Dialog.Content
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[88dvh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl dark:bg-zinc-900"
      >
        <div class="flex items-start justify-between gap-2 p-5 pb-2">
          <div class="min-w-0 flex-1">
            <PerformanceManageMenu
              performance={overview}
              {actions}
              {choirTimeZone}
              align="first-line"
              onDeleted={close}
            >
              <Dialog.Title
                class="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight"
              >
                {overview.name}
                {#if overview.isMajor}<MajorBadge />{/if}
              </Dialog.Title>
              <Dialog.Description class="text-sm text-zinc-500">{description}</Dialog.Description>
            </PerformanceManageMenu>
          </div>
          <Dialog.Close
            class="grid size-11 shrink-0 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"><X class="size-5" /></Dialog.Close
          >
        </div>

        <div class="flex-1 overflow-y-auto px-5 pb-5">
          <h3 class="mt-3 mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Pieces
          </h3>
          {#if problem !== undefined}
            <div class="my-2"><AlertMessage>{problem}</AlertMessage></div>
          {/if}
          {#if items.length === 0}
            <p class="py-3 text-sm text-zinc-500">
              No Pieces yet. Add one from its menu with “Add to a Performance…”.
            </p>
          {/if}

          <form
            bind:this={reorderForm}
            method="POST"
            action={performanceActionPath(formActions.performances.reorder)}
            use:enhance={submitPerformanceForm(showProblem)}
            class="hidden"
          >
            <input type="hidden" name="performance" value={overview.id} />
            {#each items as piece (piece.id)}
              <input type="hidden" name="piece" value={piece.id} />
            {/each}
          </form>
          <form
            bind:this={removeForm}
            method="POST"
            action={performanceActionPath(formActions.performances.removePiece)}
            use:enhance={submitPerformanceForm(showProblem)}
            class="hidden"
          >
            <input type="hidden" name="performance" value={overview.id} />
            <input type="hidden" name="piece" value={removing?.id ?? ''} />
          </form>

          <ol
            class="divide-y divide-zinc-100 dark:divide-zinc-800"
            aria-label="Pieces in {overview.name}"
            use:dragHandleZone={{
              items: [...items],
              flipDurationMs,
              dropTargetStyle: {},
              dragDisabled: !mayChangeOrder,
            }}
            onconsider={onConsider}
            onfinalize={onFinalize}
          >
            {#each items as piece, index (piece.id)}
              <li animate:flip={{ duration: flipDurationMs }}>
                <ManageMenu actions={rowMenu(piece)} label="Actions for {piece.title}">
                  <div class="flex items-center gap-1">
                    {#if mayChangeOrder}
                      <span
                        use:dragHandle
                        aria-label="Drag to reorder {piece.title}"
                        class="grid size-11 shrink-0 cursor-grab touch-none place-items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          class="size-4"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle cx="5" cy="5" r="1.6" />
                          <circle cx="11" cy="5" r="1.6" />
                          <circle cx="5" cy="11" r="1.6" />
                          <circle cx="11" cy="11" r="1.6" />
                        </svg>
                      </span>
                    {/if}
                    <a
                      href={piecePath(piece.id)}
                      class="group flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left"
                    >
                      <span class="w-5 shrink-0 text-sm text-zinc-400">{index + 1}</span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium">{piece.title}</span>
                        <span class="block truncate text-sm text-zinc-500">{piece.composer}</span>
                      </span>
                      <ChevronRight
                        class="size-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </ManageMenu>
              </li>
            {/each}
          </ol>
        </div>
      </Dialog.Content>
    {/if}
  </Dialog.Portal>
</Dialog.Root>
