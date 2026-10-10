<script lang="ts">
  // A dialog that renames the label of a Practice Track or a Score: one field, posted to the page's
  // rename form action with the item's id. It closes when the change went through and shows a
  // refusal inside itself.
  import { enhance } from '$app/forms';
  import { actionPath } from '../../core/paths';
  import { closeOnSuccess } from '../../shell/enhance';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from './Btn.svelte';
  import Modal from './Modal.svelte';
  import { fieldLabel, input } from './styles';

  const {
    open,
    onClose,
    description,
    action,
    idField,
    target,
    maxLength,
    required,
    problem,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly description: string;
    /** The name of the form action that renames it. */
    readonly action: string;
    /** The form field that carries the item's id: `track` or `score`. */
    readonly idField: string;
    /** The item being renamed, or null while the dialog is closed. */
    readonly target: { readonly id: string; readonly label: string } | null;
    readonly maxLength: number;
    /** Whether a label must not be empty. */
    readonly required: boolean;
    /** What the last refused change said. */
    readonly problem: string | undefined;
  } = $props();

  const uid = $props.id();
  const closeIfDone = $derived(closeOnSuccess(onClose));
</script>

<Modal {open} {onClose} title="Rename label" {description}>
  {#if target !== null}
    <form
      id="{uid}-form"
      method="POST"
      action={actionPath(action)}
      use:enhance={closeIfDone}
      class="flex flex-col gap-4"
    >
      <input type="hidden" name={idField} value={target.id} />
      <div>
        <label for="{uid}-label" class={fieldLabel}>Label</label>
        <input
          id="{uid}-label"
          name="label"
          {required}
          maxlength={maxLength}
          class={input}
          value={target.label}
        />
      </div>
      {#if problem !== undefined}
        <AlertMessage>{problem}</AlertMessage>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={onClose}>Cancel</Btn>
    <Btn type="submit" form="{uid}-form">Save label</Btn>
  {/snippet}
</Modal>
