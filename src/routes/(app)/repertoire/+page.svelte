<script lang="ts">
  import { enhance } from '$app/forms';
  import { AlertDialog } from 'bits-ui';
  import { Pencil, Plus, Trash } from '@lucide/svelte';
  import AlertMessage from '../../../lib/components/AlertMessage.svelte';
  import PieceLink from '../../../lib/components/PieceLink.svelte';
  import { createDialogState } from '../../../lib/components/dialog-state.svelte';
  import Btn from '../../../lib/components/ui/Btn.svelte';
  import ManageMenu from '../../../lib/components/ui/ManageMenu.svelte';
  import Modal from '../../../lib/components/ui/Modal.svelte';
  import { card, fieldLabel, hint, input } from '../../../lib/components/ui/styles';
  import { actionPath, formActions } from '../../../lib/core/paths';
  import {
    composerMaxLength,
    notesMaxLength,
    pieceDialogCopy,
    titleMaxLength,
    type RepertoireEntry,
  } from '../../../lib/core/pieces';
  import { closeOnSuccess } from '../../../lib/shell/enhance';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  type Dialog =
    | { readonly kind: 'new' }
    | { readonly kind: 'edit' | 'delete'; readonly piece: RepertoireEntry };
  const dialog = createDialogState<Dialog>();
  const current = $derived(dialog.current);
  const subjectOf = (shown: Dialog): RepertoireEntry | null =>
    shown.kind === 'new' ? null : shown.piece;
  const copy = $derived(
    current === null ? null : pieceDialogCopy(current.kind, subjectOf(current)),
  );
  const closeIfDone = closeOnSuccess(dialog.close);

  // A refusal is shown inside the open dialog. Reopening a dialog does not bring back the last one's.
  let dismissed = $state<ActionData>(null);
  const problem = $derived(form !== dismissed ? form?.problem : undefined);

  const openDialog = (next: Dialog) => {
    dismissed = form;
    dialog.open(next);
  };

  const actionsOf = (piece: RepertoireEntry) => [
    ...(data.rowActions.includes('edit')
      ? [
          {
            key: 'edit',
            label: 'Edit…',
            icon: Pencil,
            run: () => {
              openDialog({ kind: 'edit', piece });
            },
          },
        ]
      : []),
    ...(data.rowActions.includes('delete')
      ? [
          {
            key: 'delete',
            label: 'Delete…',
            icon: Trash,
            danger: true,
            run: () => {
              openDialog({ kind: 'delete', piece });
            },
          },
        ]
      : []),
  ];
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
  <div class="flex items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold tracking-tight">Repertoire</h1>
    {#if data.mayAdd}
      <Btn
        size="sm"
        variant="soft"
        onclick={() => {
          openDialog({ kind: 'new' });
        }}><Plus class="size-4" /> New Piece</Btn
      >
    {/if}
  </div>

  {#if data.pieces.length === 0}
    <p class="text-sm text-zinc-500">No Pieces yet.</p>
  {/if}

  <ul class="flex flex-col gap-2" aria-label="Pieces">
    {#each data.pieces as piece (piece.id)}
      {@const rowActions = actionsOf(piece)}
      <li data-testid="piece">
        <div class="{card} {rowActions.length === 0 ? '' : 'pr-1'}">
          {#if rowActions.length === 0}
            <PieceLink {piece} />
          {:else}
            <ManageMenu actions={rowActions} label="Actions for {piece.title}">
              <PieceLink {piece} />
            </ManageMenu>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</div>

<Modal
  open={current?.kind === 'new' || current?.kind === 'edit'}
  onClose={dialog.close}
  title={copy?.title ?? ''}
  description={copy?.description ?? ''}
>
  {#if current?.kind === 'new' || current?.kind === 'edit'}
    {@const piece = subjectOf(current)}
    <form
      id="piece-form"
      method="POST"
      action={actionPath(
        current.kind === 'new' ? formActions.pieces.create : formActions.pieces.update,
      )}
      use:enhance={closeIfDone}
      class="flex flex-col gap-5"
    >
      {#if piece !== null}
        <input type="hidden" name="piece" value={piece.id} />
      {/if}
      <div>
        <label for="piece-title" class={fieldLabel}>Title</label>
        <input
          id="piece-title"
          name="title"
          required
          maxlength={titleMaxLength}
          class={input}
          value={piece?.title ?? ''}
        />
      </div>
      <div>
        <label for="piece-composer" class={fieldLabel}>Composer (optional)</label>
        <input
          id="piece-composer"
          name="composer"
          maxlength={composerMaxLength}
          class={input}
          value={piece?.composer ?? ''}
        />
      </div>
      <div>
        <label for="piece-notes" class={fieldLabel}>Conductor’s Notes (optional)</label>
        <textarea
          id="piece-notes"
          name="notes"
          rows="4"
          maxlength={notesMaxLength}
          class="{input} h-auto py-2">{piece?.notes ?? ''}</textarea
        >
        <p class={hint}>General directions for every Singer, such as “sing brightly”.</p>
      </div>
      {#if problem !== undefined}
        <AlertMessage>{problem}</AlertMessage>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={dialog.close}>Cancel</Btn>
    <Btn type="submit" form="piece-form">{copy?.submit ?? ''}</Btn>
  {/snippet}
</Modal>

<Modal
  alert
  open={current?.kind === 'delete'}
  onClose={dialog.close}
  title={copy?.title ?? ''}
  description={copy?.description ?? ''}
>
  {#if current?.kind === 'delete'}
    <form
      id="delete-piece-form"
      method="POST"
      action={actionPath(formActions.pieces.delete)}
      use:enhance={closeIfDone}
    >
      <input type="hidden" name="piece" value={current.piece.id} />
    </form>
    {#if problem !== undefined}
      <div class="mt-3"><AlertMessage>{problem}</AlertMessage></div>
    {/if}
  {/if}
  {#snippet footer()}
    <AlertDialog.Cancel>
      {#snippet child({ props })}
        <Btn variant="ghost" {...props}>Cancel</Btn>
      {/snippet}
    </AlertDialog.Cancel>
    <Btn variant="danger" type="submit" form="delete-piece-form">{copy?.submit ?? ''}</Btn>
  {/snippet}
</Modal>
