<script lang="ts">
  import { goto } from '$app/navigation';
  import Btn from '../ui/Btn.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, hint, input } from '../ui/styles';
  import { addPiece, closeManage } from '../manage.svelte';
  let title = $state('');
  let composer = $state('');
  const ok = $derived(title.trim() !== '');
  function create() {
    if (!ok) return;
    const id = addPiece(title, composer);
    closeManage();
    goto(`/piece/${id}`); // straight to the new Piece so tracks and a Score can be uploaded
  }
</script>

<Modal open onclose={closeManage} title="New Piece" description="Add it to the Repertoire, then upload Practice Tracks and a Score.">
  <form id="new-piece" class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); create(); }}>
    <div><label for="np-title" class={fieldLabel}>Title</label><!-- svelte-ignore a11y_autofocus --><input id="np-title" class={input} bind:value={title} autofocus /></div>
    <div><label for="np-composer" class={fieldLabel}>Composer <span class="font-normal text-zinc-500">(optional)</span></label><input id="np-composer" class={input} bind:value={composer} /><p class={hint}>Arrangers too, e.g. “Trad., arr. Ross”.</p></div>
  </form>
  {#snippet footer()}
    <Btn variant="ghost" onclick={closeManage}>Cancel</Btn>
    <Btn type="submit" form="new-piece" disabled={!ok}>Create Piece</Btn>
  {/snippet}
</Modal>
