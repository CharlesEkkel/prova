<script lang="ts">
  import { ArrowLeft, CalendarPlus, Pencil } from '@lucide/svelte';
  import AddToPerformancesDialog from '../../../../lib/components/performances/AddToPerformancesDialog.svelte';
  import PiecePerformances from '../../../../lib/components/performances/PiecePerformances.svelte';
  import { addToPerformanceChoices } from '../../../../lib/core/performances';
  import PieceDetails from '../../../../lib/components/PieceDetails.svelte';
  import PieceFormDialog from '../../../../lib/components/PieceFormDialog.svelte';
  import PlaybackScope from '../../../../lib/components/PlaybackScope.svelte';
  import ScoresPanel from '../../../../lib/components/scores/ScoresPanel.svelte';
  import UploadScoreDialog from '../../../../lib/components/scores/UploadScoreDialog.svelte';
  import PiecePlayer from '../../../../lib/components/tracks/PiecePlayer.svelte';
  import PracticeTracksPanel from '../../../../lib/components/tracks/PracticeTracksPanel.svelte';
  import UploadTrackDialog from '../../../../lib/components/tracks/UploadTrackDialog.svelte';
  import ManageMenu from '../../../../lib/components/ui/ManageMenu.svelte';
  import type { StartControl } from '../../../../lib/components/tracks/start-control';
  import { paths } from '../../../../lib/core/paths';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
  const piece = $derived(data.piece);

  let editing = $state(false);
  // A refusal is shown inside the open dialog; reopening it does not bring back the last one's.
  let dismissed = $state<ActionData>(null);
  const editProblem = $derived(form !== dismissed ? form?.problem : undefined);
  let addingToPerformances = $state(false);
  const pieceActions = $derived([
    ...(data.mayEditPiece
      ? [
          {
            key: 'edit',
            label: 'Edit…',
            icon: Pencil,
            run: () => {
              dismissed = form;
              editing = true;
            },
          },
        ]
      : []),
    ...(data.mayAddToPerformances
      ? [
          {
            key: 'add-to-performances',
            label: 'Add to a Performance…',
            icon: CalendarPlus,
            run: () => {
              addingToPerformances = true;
            },
          },
        ]
      : []),
  ]);
  const inPerformances = $derived(
    data.performances.filter(({ id }) => data.pieceIsIn.includes(id)),
  );

  let uploading = $state(false);
  let uploadingScore = $state(false);
  // The player, so the Score viewer can offer Start when the Singer has not started the audio yet.
  let startControl = $state<StartControl>();
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
  <a href={paths.repertoire} class="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-500">
    <ArrowLeft class="size-4" aria-hidden="true" /> Repertoire
  </a>

  <ManageMenu actions={pieceActions} label="Actions for {piece.title}" align="first-line">
    <PieceDetails {piece} />
  </ManageMenu>

  <PiecePerformances performances={inPerformances} choirTimeZone={data.choirTimeZone} />

  <!-- Keyed by Piece, so moving to another Piece stops the audio and starts the player fresh. -->
  {#key piece.id}
    <PlaybackScope>
      {#snippet children(player)}
        <PiecePlayer
          onControl={(control) => {
            startControl = control;
          }}
          pieceId={piece.id}
          {player}
          tracks={data.tracks}
          voiceParts={data.voiceParts}
          voicePartId={data.voicePartId}
        />

        <PracticeTracksPanel
          tracks={data.tracks}
          voiceParts={data.voiceParts}
          actions={data.trackActions}
          mayUpload={data.mayUpload}
          problem={form?.problem}
          onUpload={() => {
            uploading = true;
          }}
        />

        <ScoresPanel
          pieceId={piece.id}
          scores={data.scores}
          actions={data.scoreActions}
          mayUpload={data.mayUploadScore}
          problem={form?.problem}
          {player}
          canStart={startControl?.canStart() ?? false}
          onStart={() => {
            void startControl?.start();
          }}
          onUpload={() => {
            uploadingScore = true;
          }}
        />
      {/snippet}
    </PlaybackScope>
  {/key}
</div>

<UploadTrackDialog
  open={uploading}
  onClose={() => {
    uploading = false;
  }}
  pieceId={piece.id}
  pieceTitle={piece.title}
  voiceParts={data.voiceParts}
  defaultPartId={data.voicePartId}
  limitMiB={data.uploadLimitMiB}
/>

<UploadScoreDialog
  open={uploadingScore}
  onClose={() => {
    uploadingScore = false;
  }}
  pieceId={piece.id}
  pieceTitle={piece.title}
  choirChoice={data.choirChoice}
  limitMiB={data.scoreUploadLimitMiB}
/>

<AddToPerformancesDialog
  open={addingToPerformances}
  onClose={() => {
    addingToPerformances = false;
  }}
  pieceId={piece.id}
  pieceTitle={piece.title}
  choices={addToPerformanceChoices(data.performances, data.pieceIsIn, new Date())}
  choirTimeZone={data.choirTimeZone}
/>

<PieceFormDialog
  open={editing}
  onClose={() => {
    editing = false;
  }}
  {piece}
  problem={editProblem}
/>
