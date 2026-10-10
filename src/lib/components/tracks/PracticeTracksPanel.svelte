<script lang="ts">
  // Every track on the Piece, as a reference list in the order uploaded: kind badge, label, length.
  // Each row has the actions the Singer's Permissions allow (a right-click or long-press menu and a
  // visible ⋯ button); a Singer with `append` also sees Upload Practice Track.
  import { enhance } from '$app/forms';
  import { AlertDialog, Collapsible } from 'bits-ui';
  import { AudioLines, ChevronDown, Pencil, Trash, Upload } from '@lucide/svelte';
  import { actionPath, formActions } from '../../core/paths';
  import {
    sourceName,
    trackLabelMaxLength,
    trackTitle,
    type PracticeTrack,
    type TrackAction,
  } from '../../core/practice-tracks';
  import { closeOnSuccess } from '../../shell/enhance';
  import type { VoicePart } from '../../shell/voice-parts';
  import AlertMessage from '../AlertMessage.svelte';
  import { createDialogState } from '../dialog-state.svelte';
  import Btn from '../ui/Btn.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, input } from '../ui/styles';
  import TrackRow from './TrackRow.svelte';

  const {
    tracks,
    voiceParts,
    actions,
    mayUpload,
    problem,
    onUpload,
  }: {
    readonly tracks: readonly PracticeTrack[];
    readonly voiceParts: readonly VoicePart[];
    readonly actions: readonly TrackAction[];
    readonly mayUpload: boolean;
    /** What the last refused change said, shown inside the open dialog. */
    readonly problem: string | undefined;
    readonly onUpload: () => void;
  } = $props();

  type Dialog = { readonly kind: 'rename' | 'delete'; readonly track: PracticeTrack };
  const dialog = createDialogState<Dialog>();
  const current = $derived(dialog.current);
  const closeIfDone = closeOnSuccess(dialog.close);

  const nameOf = (id: string): string => voiceParts.find((part) => part.id === id)?.name ?? '';
  const titleOf = (track: PracticeTrack): string => trackTitle(track, nameOf);

  // A refusal is shown inside the open dialog; reopening a dialog does not bring back the last one's.
  let dismissed = $state<string | undefined>(undefined);
  const shownProblem = $derived(problem !== dismissed ? problem : undefined);
  const openDialog = (next: Dialog): void => {
    dismissed = problem;
    dialog.open(next);
  };

  const actionsOf = (track: PracticeTrack) => [
    ...(actions.includes('rename')
      ? [
          {
            key: 'rename',
            label: 'Rename label…',
            icon: Pencil,
            run: () => {
              openDialog({ kind: 'rename', track });
            },
          },
        ]
      : []),
    ...(actions.includes('delete')
      ? [
          {
            key: 'delete',
            label: 'Delete…',
            icon: Trash,
            danger: true,
            run: () => {
              openDialog({ kind: 'delete', track });
            },
          },
        ]
      : []),
  ];
</script>

<Collapsible.Root class="rounded-2xl border bg-white dark:bg-zinc-900">
  <Collapsible.Trigger
    data-testid="tracks-panel-trigger"
    class="group flex min-h-14 w-full items-center gap-3 px-4 text-left"
  >
    <AudioLines class="size-5 text-zinc-400" aria-hidden="true" />
    <span class="flex-1 text-sm font-medium">
      Practice Tracks<span class="ml-1.5 font-normal text-zinc-500">· {tracks.length}</span>
    </span>
    <ChevronDown
      class="size-4 text-zinc-400 transition group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </Collapsible.Trigger>
  <Collapsible.Content class="flex flex-col gap-1 px-4 pb-4">
    <ul class="flex flex-col" aria-label="Practice Tracks">
      {#each tracks as track (track.id)}
        {@const rowActions = actionsOf(track)}
        {@const partName =
          track.source.type === 'part' && track.label !== ''
            ? sourceName(track.source, nameOf)
            : ''}
        <li data-testid="track">
          {#if rowActions.length === 0}
            <TrackRow {track} title={titleOf(track)} {partName} />
          {:else}
            <ManageMenu actions={rowActions} label="Actions for {titleOf(track)}">
              <TrackRow {track} title={titleOf(track)} {partName} />
            </ManageMenu>
          {/if}
        </li>
      {:else}
        <li class="px-2 py-2 text-sm text-zinc-500">No Practice Tracks yet.</li>
      {/each}
    </ul>
    {#if mayUpload}
      <Btn variant="outline" size="sm" class="mt-2 self-start" onclick={onUpload}>
        <Upload class="size-4" aria-hidden="true" /> Upload Practice Track
      </Btn>
    {/if}
  </Collapsible.Content>
</Collapsible.Root>

<Modal
  open={current?.kind === 'rename'}
  onClose={dialog.close}
  title="Rename label"
  description="Change the label of this Practice Track. The file itself never changes."
>
  {#if current?.kind === 'rename'}
    <form
      id="rename-track-form"
      method="POST"
      action={actionPath(formActions.tracks.rename)}
      use:enhance={closeIfDone}
      class="flex flex-col gap-4"
    >
      <input type="hidden" name="track" value={current.track.id} />
      <div>
        <label for="rename-label" class={fieldLabel}>Label</label>
        <input
          id="rename-label"
          name="label"
          maxlength={trackLabelMaxLength}
          class={input}
          value={current.track.label}
        />
      </div>
      {#if shownProblem !== undefined}
        <AlertMessage>{shownProblem}</AlertMessage>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={dialog.close}>Cancel</Btn>
    <Btn type="submit" form="rename-track-form">Save label</Btn>
  {/snippet}
</Modal>

<Modal
  alert
  open={current?.kind === 'delete'}
  onClose={dialog.close}
  title={current === null ? '' : `Delete ${titleOf(current.track)}?`}
  description="The track and its file are removed. This cannot be undone."
>
  {#if current?.kind === 'delete'}
    <form
      id="delete-track-form"
      method="POST"
      action={actionPath(formActions.tracks.delete)}
      use:enhance={closeIfDone}
    >
      <input type="hidden" name="track" value={current.track.id} />
    </form>
    {#if shownProblem !== undefined}
      <div class="mt-3"><AlertMessage>{shownProblem}</AlertMessage></div>
    {/if}
  {/if}
  {#snippet footer()}
    <AlertDialog.Cancel>
      {#snippet child({ props })}
        <Btn variant="ghost" {...props}>Cancel</Btn>
      {/snippet}
    </AlertDialog.Cancel>
    <Btn variant="danger" type="submit" form="delete-track-form">Delete track</Btn>
  {/snippet}
</Modal>
