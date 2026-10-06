<script lang="ts">
  // Mounts whichever management dialog is open (see manage.dialog). Each dialog owns its own form state,
  // so mounting it fresh each time resets the form. `shown` keeps the last dialog around while one is
  // closing, so a dialog never reads from a null target during teardown.
  import { manage, type ManageDialog } from '../manage.svelte';
  import AddToPerformanceDialog from './AddToPerformanceDialog.svelte';
  import DeleteDialog from './DeleteDialog.svelte';
  import NewPerformanceDialog from './NewPerformanceDialog.svelte';
  import NewPieceDialog from './NewPieceDialog.svelte';
  import RenameDialog from './RenameDialog.svelte';
  import UploadScoreDialog from './UploadScoreDialog.svelte';
  import UploadTrackDialog from './UploadTrackDialog.svelte';
  let shown = $state.raw<ManageDialog | null>(null);
  $effect.pre(() => {
    if (manage.dialog) shown = manage.dialog;
  });
  const open = $derived(manage.dialog !== null);
</script>

{#if open && shown}
  {#if shown.kind === 'rename'}{#key shown.target.id}<RenameDialog target={shown.target} />{/key}
  {:else if shown.kind === 'delete'}{#key shown.target.id}<DeleteDialog target={shown.target} />{/key}
  {:else if shown.kind === 'upload-track'}<UploadTrackDialog pieceId={shown.pieceId} />
  {:else if shown.kind === 'upload-score'}<UploadScoreDialog pieceId={shown.pieceId} />
  {:else if shown.kind === 'add-to-performance'}<AddToPerformanceDialog pieceId={shown.pieceId} />
  {:else if shown.kind === 'new-piece'}<NewPieceDialog />
  {:else if shown.kind === 'new-performance'}<NewPerformanceDialog />
  {/if}
{/if}
