<script lang="ts">
  import { options } from './player.svelte';
</script>

<div class="opts">
  <button class="switch" class:on={options.skipEmpty} role="switch" aria-checked={options.skipEmpty} onclick={() => (options.skipEmpty = !options.skipEmpty)}>
    <span class="track"></span><span>Skip Pieces with no Practice Tracks</span>
  </button>
  <button class="switch" class:on={options.preferCombined} role="switch" aria-checked={options.preferCombined} onclick={() => (options.preferCombined = !options.preferCombined)}>
    <span class="track"></span><span>Prefer Combined Tracks</span>
  </button>
</div>
