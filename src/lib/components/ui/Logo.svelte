<script lang="ts">
  import { Music } from '@lucide/svelte';

  const { size = 'md' }: { readonly size?: 'sm' | 'md' } = $props();
</script>

<div
  class="grid place-items-center bg-primary-600 text-white {size === 'sm'
    ? 'size-7 rounded-lg'
    : 'size-8 rounded-xl'}"
>
  <Music size={16} aria-hidden="true" />
</div>
