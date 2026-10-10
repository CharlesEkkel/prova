<script lang="ts">
  // The dialog that adds a Piece (no `piece`) or edits one: title, composer and Conductor's Notes. It
  // posts to the page's create or update form action, closes when that went through, and shows a
  // refusal inside itself. Used by the Repertoire and by the Piece's own page.
  import { enhance } from '$app/forms';
  import { actionPath, formActions } from '../core/paths';
  import {
    composerMaxLength,
    notesMaxLength,
    pieceDialogCopy,
    titleMaxLength,
    type RepertoireEntry,
  } from '../core/pieces';
  import { closeOnSuccess } from '../shell/enhance';
  import AlertMessage from './AlertMessage.svelte';
  import Btn from './ui/Btn.svelte';
  import Modal from './ui/Modal.svelte';
  import { fieldLabel, hint, input } from './ui/styles';

  const {
    open,
    onClose,
    piece,
    problem,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    /** The Piece being edited, or null to add a new one. */
    readonly piece: RepertoireEntry | null;
    /** What the last refused change said, shown inside the dialog. */
    readonly problem: string | undefined;
  } = $props();

  const copy = $derived(pieceDialogCopy(piece === null ? 'new' : 'edit', piece));
  const closeIfDone = $derived(closeOnSuccess(onClose));
</script>

<Modal {open} {onClose} title={copy.title} description={copy.description}>
  {#if open}
    <form
      id="piece-form"
      method="POST"
      action={actionPath(piece === null ? formActions.pieces.create : formActions.pieces.update)}
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
        <label for="piece-composer" class={fieldLabel}>Composer</label>
        <input
          id="piece-composer"
          name="composer"
          required
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
    <Btn variant="ghost" onclick={onClose}>Cancel</Btn>
    <Btn type="submit" form="piece-form">{copy.submit}</Btn>
  {/snippet}
</Modal>
