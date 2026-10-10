<script lang="ts">
  // The Piece's Scores, as a collapsed panel the Singer opens: many use their own music, so a Score is
  // never opened for them. It lists the Scores (the choir score first and marked); tapping a row opens
  // that Score in the full-screen viewer straight away. Each row has the actions the
  // Singer's Permissions allow (a right-click or long-press menu and a visible ⋯ button); a Singer with
  // `append` also sees Upload Score.
  import { enhance } from '$app/forms';
  import { AlertDialog, Collapsible } from 'bits-ui';
  import { ChevronDown, FileMusic, Pencil, Star, Trash, Upload } from '@lucide/svelte';
  import { actionPath, formActions } from '../../core/paths';
  import type { PieceId } from '../../core/pieces';
  import {
    choirScoreOf,
    scoreLabelMaxLength,
    scoreOrder,
    type Score,
    type ScoreAction,
    type ScoreId,
  } from '../../core/scores';
  import type { AudioPlayer } from '../../shell/audio-player.svelte';
  import { closeOnSuccess } from '../../shell/enhance';
  import AlertMessage from '../AlertMessage.svelte';
  import { createDialogState } from '../dialog-state.svelte';
  import Btn from '../ui/Btn.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, input } from '../ui/styles';
  import ScoreRow from './ScoreRow.svelte';
  import ScoreViewer from './ScoreViewer.svelte';

  const {
    pieceId,
    scores,
    actions,
    mayUpload,
    problem,
    player,
    canStart,
    onStart,
    onUpload,
  }: {
    readonly pieceId: PieceId;
    readonly scores: readonly Score[];
    readonly actions: readonly ScoreAction[];
    readonly mayUpload: boolean;
    /** What the last refused change said, shown inside the open dialog. */
    readonly problem: string | undefined;
    readonly player: AudioPlayer;
    readonly canStart: boolean;
    readonly onStart: () => void;
    readonly onUpload: () => void;
  } = $props();

  type Dialog = { readonly kind: 'rename' | 'choir' | 'delete'; readonly score: Score };
  const dialog = createDialogState<Dialog>();
  const current = $derived(dialog.current);
  const closeIfDone = closeOnSuccess(dialog.close);

  const ordered = $derived(scoreOrder(scores));
  const choir = $derived(choirScoreOf(scores));

  // Nothing is opened until the Singer taps a Score's row, and a Score that has gone closes its viewer.
  let viewingId = $state<ScoreId | null>(null);
  const viewingScore = $derived(scores.find(({ id }) => id === viewingId) ?? null);

  // A refusal is shown inside the open dialog; reopening a dialog does not bring back the last one's.
  let dismissed = $state<string | undefined>(undefined);
  const shownProblem = $derived(problem !== dismissed ? problem : undefined);
  const openDialog = (next: Dialog): void => {
    dismissed = problem;
    dialog.open(next);
  };

  const actionsOf = (score: Score) => [
    ...(actions.includes('rename')
      ? [
          {
            key: 'rename',
            label: 'Rename label…',
            icon: Pencil,
            run: () => {
              openDialog({ kind: 'rename', score });
            },
          },
        ]
      : []),
    ...(actions.includes('make-choir')
      ? [
          {
            key: 'make-choir',
            label: 'Make this the choir score',
            icon: Star,
            disabled: score.isChoirScore,
            run: () => {
              openDialog({ kind: 'choir', score });
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
              openDialog({ kind: 'delete', score });
            },
          },
        ]
      : []),
  ];
</script>

<Collapsible.Root class="rounded-2xl border bg-white dark:bg-zinc-900">
  <Collapsible.Trigger
    data-testid="scores-panel-trigger"
    class="group flex min-h-14 w-full items-center gap-3 px-4 text-left"
  >
    <FileMusic class="size-5 text-zinc-400" aria-hidden="true" />
    <span class="flex-1 text-sm font-medium">
      Scores<span class="ml-1.5 font-normal text-zinc-500">· {scores.length}</span>
    </span>
    <ChevronDown
      class="size-4 text-zinc-400 transition group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </Collapsible.Trigger>
  <Collapsible.Content class="flex flex-col gap-3 px-4 pb-4">
    <ul class="flex flex-col" aria-label="Scores">
      {#each ordered as score (score.id)}
        {@const rowActions = actionsOf(score)}
        <li data-testid="score">
          {#if rowActions.length === 0}
            <ScoreRow
              {score}
              onOpen={() => {
                viewingId = score.id;
              }}
            />
          {:else}
            <ManageMenu actions={rowActions} label="Actions for {score.label}">
              <ScoreRow
                {score}
                onOpen={() => {
                  viewingId = score.id;
                }}
              />
            </ManageMenu>
          {/if}
        </li>
      {:else}
        <li class="px-2 py-2 text-sm text-zinc-500">No Scores yet.</li>
      {/each}
    </ul>

    {#if mayUpload}
      <Btn variant="outline" size="sm" class="self-start" onclick={onUpload}>
        <Upload class="size-4" aria-hidden="true" /> Upload Score
      </Btn>
    {/if}
  </Collapsible.Content>
</Collapsible.Root>

<ScoreViewer
  open={viewingScore !== null}
  onClose={() => {
    viewingId = null;
  }}
  {pieceId}
  score={viewingScore}
  {player}
  {canStart}
  {onStart}
/>

<Modal
  open={current?.kind === 'rename'}
  onClose={dialog.close}
  title="Rename label"
  description="Change the label of this Score. The file itself never changes."
>
  {#if current?.kind === 'rename'}
    <form
      id="rename-score-form"
      method="POST"
      action={actionPath(formActions.scores.rename)}
      use:enhance={closeIfDone}
      class="flex flex-col gap-4"
    >
      <input type="hidden" name="score" value={current.score.id} />
      <div>
        <label for="rename-score-label" class={fieldLabel}>Label</label>
        <input
          id="rename-score-label"
          name="label"
          required
          maxlength={scoreLabelMaxLength}
          class={input}
          value={current.score.label}
        />
      </div>
      {#if shownProblem !== undefined}
        <AlertMessage>{shownProblem}</AlertMessage>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={dialog.close}>Cancel</Btn>
    <Btn type="submit" form="rename-score-form">Save label</Btn>
  {/snippet}
</Modal>

<Modal
  open={current?.kind === 'choir'}
  onClose={dialog.close}
  title={current === null ? '' : `Make ${current.score.label} the choir score?`}
  description={choir === undefined
    ? 'The choir treats the choir score as its own: it is offered first.'
    : `It replaces ${choir.label}, which stays on the Piece as an ordinary Score.`}
>
  {#if current?.kind === 'choir'}
    <form
      id="choir-score-form"
      method="POST"
      action={actionPath(formActions.scores.makeChoir)}
      use:enhance={closeIfDone}
    >
      <input type="hidden" name="score" value={current.score.id} />
    </form>
    {#if shownProblem !== undefined}
      <div class="mt-3"><AlertMessage>{shownProblem}</AlertMessage></div>
    {/if}
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={dialog.close}>Cancel</Btn>
    <Btn type="submit" form="choir-score-form">Make choir score</Btn>
  {/snippet}
</Modal>

<Modal
  alert
  open={current?.kind === 'delete'}
  onClose={dialog.close}
  title={current === null ? '' : `Delete ${current.score.label}?`}
  description={current?.score.isChoirScore === true
    ? 'The Score and its file are removed, and the Piece is left without a choir score. This cannot be undone.'
    : 'The Score and its file are removed. This cannot be undone.'}
>
  {#if current?.kind === 'delete'}
    <form
      id="delete-score-form"
      method="POST"
      action={actionPath(formActions.scores.delete)}
      use:enhance={closeIfDone}
    >
      <input type="hidden" name="score" value={current.score.id} />
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
    <Btn variant="danger" type="submit" form="delete-score-form">Delete Score</Btn>
  {/snippet}
</Modal>
