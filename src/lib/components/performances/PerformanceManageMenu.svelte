<script lang="ts">
  // A Performance's management actions, by right-click or the ⋯ button, wherever it appears: Edit
  // (name, times, venue) for a Singer with `update` and Delete for one with `delete`. It owns their
  // dialogs, so the Overview and Home offer the same actions the same way.
  import { enhance } from '$app/forms';
  import { AlertDialog } from 'bits-ui';
  import { Pencil, Trash } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { ChoirTimeZone } from '../../core/choir-time';
  import { formActions, performanceActionPath } from '../../core/paths';
  import {
    performanceDialogCopy,
    type PerformanceAction,
    type PerformanceDetails,
  } from '../../core/performances';
  import { submitPerformanceForm, type PerformanceFormOutcome } from '../../shell/enhance';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from '../ui/Btn.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import Modal from '../ui/Modal.svelte';
  import PerformanceFormDialog from './PerformanceFormDialog.svelte';

  const {
    performance,
    actions,
    choirTimeZone,
    align = 'center',
    overlay = 'none',
    onDeleted = () => undefined,
    children,
  }: {
    readonly performance: PerformanceDetails;
    readonly actions: readonly PerformanceAction[];
    readonly choirTimeZone: ChoirTimeZone;
    readonly align?: 'center' | 'first-line';
    readonly overlay?: 'none' | 'plain' | 'on-primary';
    /** After the Performance is deleted, such as closing the Overview that showed it. */
    readonly onDeleted?: () => unknown;
    readonly children: Snippet;
  } = $props();

  let editing = $state(false);
  let deleting = $state(false);
  let deleteProblem = $state<string | undefined>(undefined);

  const menu = $derived([
    ...(actions.includes('edit')
      ? [
          {
            key: 'edit',
            label: 'Edit Performance…',
            icon: Pencil,
            run: () => {
              editing = true;
            },
          },
        ]
      : []),
    ...(actions.includes('delete')
      ? [
          {
            key: 'delete',
            label: 'Delete Performance…',
            icon: Trash,
            danger: true,
            run: () => {
              deleteProblem = undefined;
              deleting = true;
            },
          },
        ]
      : []),
  ]);

  const afterDelete = async (outcome: PerformanceFormOutcome) => {
    if (!outcome.ok) {
      deleteProblem = outcome.problem;
      return;
    }
    deleting = false;
    await onDeleted();
  };

  const deleteCopy = $derived(performanceDialogCopy('delete', performance.name));
  // One page can hold several of these, so each delete form needs its own id.
  const deleteFormId = $derived(`delete-performance-${performance.id}`);
</script>

<ManageMenu actions={menu} label="Actions for {performance.name}" {align} {overlay}>
  {@render children()}
</ManageMenu>

<PerformanceFormDialog
  open={editing}
  onClose={() => {
    editing = false;
  }}
  {performance}
  {choirTimeZone}
  repertoire={[]}
/>

<Modal
  alert
  open={deleting}
  onClose={() => {
    deleting = false;
  }}
  title={deleteCopy.title}
  description={deleteCopy.description}
>
  <form
    id={deleteFormId}
    method="POST"
    action={performanceActionPath(formActions.performances.delete)}
    use:enhance={submitPerformanceForm(afterDelete)}
  >
    <input type="hidden" name="performance" value={performance.id} />
  </form>
  {#if deleteProblem !== undefined}
    <div class="mt-3"><AlertMessage>{deleteProblem}</AlertMessage></div>
  {/if}
  {#snippet footer()}
    <AlertDialog.Cancel>
      {#snippet child({ props })}
        <Btn variant="ghost" {...props}>Cancel</Btn>
      {/snippet}
    </AlertDialog.Cancel>
    <Btn variant="danger" type="submit" form={deleteFormId}>{deleteCopy.submit}</Btn>
  {/snippet}
</Modal>
