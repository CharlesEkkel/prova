<script lang="ts">
  import Star from '@lucide/svelte/icons/star';
  let { class: cls = '' }: { class?: string } = $props();
</script>

<span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300 {cls}"><Star class="size-3 fill-current" /> Major</span>
