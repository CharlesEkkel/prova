<script lang="ts">
  import { TODAY } from '../data.svelte';
  import Btn from '../ui/Btn.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, input } from '../ui/styles';
  import { addPerformance, closeManage } from '../manage.svelte';
  let title = $state('');
  let date = $state('');
  let venue = $state('');
  const ok = $derived(title.trim() !== '' && date !== '');
  function create() {
    if (!ok) return;
    addPerformance(title, date, venue);
    closeManage();
  }
</script>

<Modal open onclose={closeManage} title="New Performance" description="A dated event the choir works toward. Add Pieces to it afterwards from the Repertoire.">
  <form id="new-perf" class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); create(); }}>
    <div><label for="nf-title" class={fieldLabel}>Name</label><!-- svelte-ignore a11y_autofocus --><input id="nf-title" class={input} bind:value={title} autofocus /></div>
    <div><label for="nf-date" class={fieldLabel}>Date</label><input id="nf-date" type="date" class={input} bind:value={date} min={TODAY} /></div>
    <div><label for="nf-venue" class={fieldLabel}>Venue <span class="font-normal text-zinc-500">(optional)</span></label><input id="nf-venue" class={input} bind:value={venue} /></div>
  </form>
  {#snippet footer()}
    <Btn variant="ghost" onclick={closeManage}>Cancel</Btn>
    <Btn type="submit" form="new-perf" disabled={!ok}>Create Performance</Btn>
  {/snippet}
</Modal>
