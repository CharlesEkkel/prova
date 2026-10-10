<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte';
  import PlaybackScope from '../../../../lib/components/PlaybackScope.svelte';
  import ScoresPanel from '../../../../lib/components/scores/ScoresPanel.svelte';
  import UploadScoreDialog from '../../../../lib/components/scores/UploadScoreDialog.svelte';
  import PiecePlayer from '../../../../lib/components/tracks/PiecePlayer.svelte';
  import PracticeTracksPanel from '../../../../lib/components/tracks/PracticeTracksPanel.svelte';
  import UploadTrackDialog from '../../../../lib/components/tracks/UploadTrackDialog.svelte';
  import type { StartControl } from '../../../../lib/components/tracks/start-control';
  import { paths } from '../../../../lib/core/paths';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
  const piece = $derived(data.piece);

  let uploading = $state(false);
  let uploadingScore = $state(false);
  // The player, so the Score viewer can offer Start when the Singer has not started the audio yet.
  let startControl = $state<StartControl>();
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
  <a href={paths.repertoire} class="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-500">
    <ArrowLeft class="size-4" aria-hidden="true" /> Repertoire
  </a>

  <header>
    <h1 class="text-2xl font-semibold tracking-tight">{piece.title}</h1>
    <p class="text-zinc-500">{piece.composer}</p>
  </header>

  {#if piece.notes !== ''}
    <section aria-labelledby="notes-heading">
      <h2 id="notes-heading" class="text-sm font-semibold">Conductor’s Notes</h2>
      <p class="mt-1 whitespace-pre-wrap">{piece.notes}</p>
    </section>
  {/if}

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
