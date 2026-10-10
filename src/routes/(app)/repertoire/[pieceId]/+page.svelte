<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte';
  import PiecePlayer from '../../../../lib/components/tracks/PiecePlayer.svelte';
  import PracticeTracksPanel from '../../../../lib/components/tracks/PracticeTracksPanel.svelte';
  import UploadTrackDialog from '../../../../lib/components/tracks/UploadTrackDialog.svelte';
  import { paths } from '../../../../lib/core/paths';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
  const piece = $derived(data.piece);

  let uploading = $state(false);
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
    <PiecePlayer
      pieceId={piece.id}
      tracks={data.tracks}
      voiceParts={data.voiceParts}
      voicePartId={data.voicePartId}
    />
  {/key}

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
