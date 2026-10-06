<script lang="ts">
  import { AlertDialog } from 'bits-ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { PERFORMANCES, piece } from '../data.svelte';
  import Modal from '../ui/Modal.svelte';
  import { closeManage, remove, type Target } from '../manage.svelte';
  let { target }: { target: Target } = $props();
  // svelte-ignore state_referenced_locally (mounted fresh for each open, so props are read once on purpose)
  const noun = { piece: 'Piece', performance: 'Performance', track: 'Practice Track', score: 'Score' }[target.type];
  const detail = $derived.by(() => {
    if (target.type === 'piece') {
      const p = piece(target.id);
      const n = PERFORMANCES.filter((x) => x.pieceIds.includes(target.id)).length;
      return `This also removes its ${p?.tracks.length ?? 0} Practice Tracks and ${p?.scores.length ?? 0} Scores, and takes it out of ${n} Performance${n === 1 ? '' : 's'}.`;
    }
    if (target.type === 'performance') return 'The Pieces stay in the Repertoire. Only the Performance and its running order go.';
    return 'The file is removed for everyone.';
  });
  function confirm() {
    remove(target);
    closeManage();
    // leave a screen that no longer exists
    if (page.url.pathname === `/piece/${target.id}`) goto('/repertoire');
    if (page.url.pathname === `/perform/${target.id}`) goto('/');
  }
</script>

<Modal open alert onclose={closeManage} title="Delete {noun}?" description="“{target.name}” will be deleted. This can't be undone.">
  <p class="text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>
  {#snippet footer()}
    <AlertDialog.Cancel class="inline-flex h-11 items-center rounded-full px-5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</AlertDialog.Cancel>
    <AlertDialog.Action onclick={confirm} class="inline-flex h-11 items-center rounded-full bg-red-600 px-5 font-medium text-white hover:bg-red-500">Delete {noun}</AlertDialog.Action>
  {/snippet}
</Modal>
