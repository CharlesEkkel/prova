<script lang="ts">
  import Btn from '../ui/Btn.svelte';
  import Modal from '../ui/Modal.svelte';
  import { errorText, fieldLabel, input } from '../ui/styles';
  import { closeManage, rename, type Target } from '../manage.svelte';
  let { target }: { target: Target } = $props();
  // svelte-ignore state_referenced_locally (mounted fresh for each open, so props are read once on purpose)
  const noun = { piece: 'Piece', performance: 'Performance', track: 'Practice Track label', score: 'Score label' }[target.type];
  // svelte-ignore state_referenced_locally (mounted fresh for each open, so props are read once on purpose)
  let name = $state(target.name);
  const empty = $derived(name.trim() === '');
  function save() {
    if (empty) return;
    rename(target, name);
    closeManage();
  }
</script>

<Modal open onclose={closeManage} title="Rename {noun}">
  <form id="rename-form" onsubmit={(e) => { e.preventDefault(); save(); }}>
    <label for="rename-input" class={fieldLabel}>Name</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="rename-input" class={input} bind:value={name} autofocus />
    {#if empty}<p class={errorText}>A name is required.</p>{/if}
  </form>
  {#snippet footer()}
    <Btn variant="ghost" onclick={closeManage}>Cancel</Btn>
    <Btn type="submit" form="rename-form" disabled={empty || name.trim() === target.name}>Save</Btn>
  {/snippet}
</Modal>
