<script lang="ts">
  // A confirmation that deletes one item (a Practice Track or a Score): it says what goes, and posts
  // the item's id to the page's delete form action only when confirmed. It closes when the delete went
  // through and shows a refusal inside itself.
  import { enhance } from '$app/forms';
  import { AlertDialog } from 'bits-ui';
  import { actionPath } from '../../core/paths';
  import { closeOnSuccess } from '../../shell/enhance';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from './Btn.svelte';
  import Modal from './Modal.svelte';

  const {
    open,
    onClose,
    title,
    description,
    submitLabel,
    action,
    idField,
    id,
    problem,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title: string;
    readonly description: string;
    /** The confirm button's text, such as "Delete Score". */
    readonly submitLabel: string;
    /** The name of the form action that deletes it. */
    readonly action: string;
    /** The form field that carries the item's id: `track` or `score`. */
    readonly idField: string;
    /** The item being deleted, or null while the dialog is closed. */
    readonly id: string | null;
    /** What the last refused change said. */
    readonly problem: string | undefined;
  } = $props();

  const uid = $props.id();
  const closeIfDone = $derived(closeOnSuccess(onClose));
</script>

<Modal alert {open} {onClose} {title} {description}>
  {#if id !== null}
    <form id="{uid}-form" method="POST" action={actionPath(action)} use:enhance={closeIfDone}>
      <input type="hidden" name={idField} value={id} />
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
    <Btn variant="danger" type="submit" form="{uid}-form">{submitLabel}</Btn>
  {/snippet}
</Modal>
