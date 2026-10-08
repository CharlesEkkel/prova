<script lang="ts">
  import { enhance } from '$app/forms';
  import { AlertDialog } from 'bits-ui';
  import { Pencil, Plus, Trash } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action';
  import AlertMessage from '../../../../lib/components/AlertMessage.svelte';
  import { createDialogState } from '../../../../lib/components/dialog-state.svelte';
  import Btn from '../../../../lib/components/ui/Btn.svelte';
  import ManageMenu from '../../../../lib/components/ui/ManageMenu.svelte';
  import Modal from '../../../../lib/components/ui/Modal.svelte';
  import { card, fieldLabel, hint, input } from '../../../../lib/components/ui/styles';
  import { voicePartDialogCopy } from '../../../../lib/core/admin-dialogs';
  import { actionPath, formActions } from '../../../../lib/core/paths';
  import {
    shortLabelMaxLength,
    shortLabelPattern,
    suggestShortLabel,
    voicePartNameMaxLength,
  } from '../../../../lib/core/voice-parts';
  import { closeOnSuccess } from '../../../../lib/shell/enhance';
  import type { AdminVoicePart } from '../../../../lib/shell/voice-parts';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();

  type Dialog =
    { readonly kind: 'new' } | { readonly kind: 'edit' | 'remove'; readonly part: AdminVoicePart };
  const dialog = createDialogState<Dialog>();
  const current = $derived(dialog.current);
  const copy = $derived(
    current === null
      ? null
      : voicePartDialogCopy(
          current.kind,
          current.kind === 'new' ? '' : current.part.name,
          current.kind === 'new' ? 0 : current.part.singerCount,
        ),
  );
  const closeIfDone = closeOnSuccess(dialog.close);

  let name = $state('');
  let label = $state('');
  // Until the Admin types a label themselves, it follows the name as a suggestion.
  let labelEdited = $state(false);

  // A refusal is shown where the Admin is looking: inside the open dialog, or on the page when a
  // move was refused. Reopening a dialog does not bring back the last one's refusal.
  let dismissed = $state<ActionData>(null);
  const problem = $derived(form !== dismissed ? form?.problem : undefined);

  const openDialog = (next: Dialog) => {
    dismissed = form;
    name = next.kind === 'edit' ? next.part.name : '';
    label = next.kind === 'edit' ? next.part.shortLabel : '';
    labelEdited = next.kind === 'edit';
    dialog.open(next);
  };

  const onNameInput = () => {
    if (!labelEdited) label = suggestShortLabel(name);
  };

  const onlyOne = $derived(data.voiceParts.length <= 1);

  const actionsOf = (part: AdminVoicePart) => [
    {
      key: 'edit',
      label: 'Edit Voice Part…',
      icon: Pencil,
      run: () => {
        openDialog({ kind: 'edit', part });
      },
    },
    {
      key: 'remove',
      label: onlyOne ? 'Remove Voice Part… (the last one stays)' : 'Remove Voice Part…',
      icon: Trash,
      danger: true,
      disabled: onlyOne,
      run: () => {
        openDialog({ kind: 'remove', part });
      },
    },
  ];

  // The order shown follows the server's, except while the Admin is dragging and until the new
  // order has been saved; saving (or a refusal) brings the server's order back.
  let items = $derived(data.voiceParts);
  const flipDurationMs = 150;
  let reorderForm = $state<HTMLFormElement | null>(null);

  const onConsider = (event: CustomEvent<DndEvent<AdminVoicePart>>) => {
    items = event.detail.items;
  };

  const onFinalize = async (event: CustomEvent<DndEvent<AdminVoicePart>>) => {
    items = event.detail.items;
    // Wait for the form's hidden fields to show the dropped order before sending them.
    await tick();
    reorderForm?.requestSubmit();
  };
</script>

{#if problem !== undefined && current === null}
  <div class="mb-4"><AlertMessage>{problem}</AlertMessage></div>
{/if}

<div class="flex flex-col gap-4">
  <div class="flex items-start justify-between gap-3">
    <p class="max-w-prose text-sm text-zinc-500">
      The choir's Voice Parts, in the order every picker shows them. A name can carry a number, such
      as Alto 1 and Alto 2. The short label is what fits on small screens.
    </p>
    <Btn
      size="sm"
      variant="soft"
      onclick={() => {
        openDialog({ kind: 'new' });
      }}><Plus class="size-4" /> New Voice Part</Btn
    >
  </div>

  <form
    bind:this={reorderForm}
    method="POST"
    action={actionPath(formActions.voiceParts.reorder)}
    use:enhance
    class="hidden"
  >
    {#each items as part (part.id)}
      <input type="hidden" name="part" value={part.id} />
    {/each}
  </form>

  <ul
    class="flex flex-col gap-2"
    aria-label="Voice Parts"
    use:dragHandleZone={{ items: [...items], flipDurationMs, dropTargetStyle: {} }}
    onconsider={onConsider}
    onfinalize={onFinalize}
  >
    {#each items as part (part.id)}
      <li data-testid="voice-part" animate:flip={{ duration: flipDurationMs }}>
        <div class="{card} pr-1">
          <ManageMenu actions={actionsOf(part)} label="Actions for {part.name}">
            <div class="flex items-center gap-1 pr-3">
              <span
                use:dragHandle
                aria-label="Drag to reorder {part.name}"
                class="grid size-11 shrink-0 cursor-grab touch-none place-items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg viewBox="0 0 16 16" class="size-4" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="5" r="1.6" />
                  <circle cx="11" cy="5" r="1.6" />
                  <circle cx="5" cy="11" r="1.6" />
                  <circle cx="11" cy="11" r="1.6" />
                </svg>
              </span>
              <span
                class="grid min-w-10 place-items-center rounded-lg bg-primary-100 px-2 py-1 text-sm font-semibold text-primary-800 dark:bg-primary-500/15 dark:text-primary-200"
                >{part.shortLabel}</span
              >
              <span class="min-w-0 py-2">
                <span class="block truncate font-medium">{part.name}</span>
                <span class="block text-xs text-zinc-500">
                  {part.singerCount === 1 ? '1 Singer' : `${part.singerCount.toString()} Singers`}
                </span>
              </span>
            </div>
          </ManageMenu>
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
    <form
      id="voice-part-form"
      method="POST"
      action={actionPath(
        current.kind === 'new' ? formActions.voiceParts.add : formActions.voiceParts.update,
      )}
      use:enhance={closeIfDone}
      class="flex flex-col gap-5"
    >
      {#if current.kind === 'edit'}
        <input type="hidden" name="part" value={current.part.id} />
      {/if}
      <div>
        <label for="voice-part-name" class={fieldLabel}>Name</label>
        <input
          id="voice-part-name"
          name="name"
          required
          maxlength={voicePartNameMaxLength}
          class={input}
          bind:value={name}
          oninput={onNameInput}
        />
      </div>
      <div>
        <label for="voice-part-label" class={fieldLabel}>Short label</label>
        <input
          id="voice-part-label"
          name="label"
          required
          maxlength={shortLabelMaxLength}
          pattern={shortLabelPattern}
          class={input}
          bind:value={label}
          oninput={() => {
            labelEdited = true;
          }}
        />
        <p class={hint}>
          Up to {shortLabelMaxLength} letters or digits, unique in the choir. All is kept for the Combined
          Track.
        </p>
      </div>
      {#if problem !== undefined}
        <AlertMessage>{problem}</AlertMessage>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={dialog.close}>Cancel</Btn>
    <Btn type="submit" form="voice-part-form">{copy?.submit ?? ''}</Btn>
  {/snippet}
</Modal>

<Modal
  alert
  open={current?.kind === 'remove'}
  onClose={dialog.close}
  title={copy?.title ?? ''}
  description={copy?.description ?? ''}
>
  {#if current?.kind === 'remove'}
    <form
      id="remove-form"
      method="POST"
      action={actionPath(formActions.voiceParts.remove)}
      use:enhance={closeIfDone}
    >
      <input type="hidden" name="part" value={current.part.id} />
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
    <Btn variant="danger" type="submit" form="remove-form">{copy?.submit ?? ''}</Btn>
  {/snippet}
</Modal>
