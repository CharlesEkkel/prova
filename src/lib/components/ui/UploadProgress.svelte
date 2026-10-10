<script lang="ts">
  // The progress of a file upload: a bar and "Uploading… 40%", then "Uploaded". Shared by the upload
  // dialogs for Practice Tracks and Scores.
  import { Progress } from 'bits-ui';
  import { Check } from '@lucide/svelte';

  const {
    fraction,
    done,
  }: {
    /** How much of the file has been sent, from 0 to 1. */
    readonly fraction: number;
    /** Whether the upload has finished. */
    readonly done: boolean;
  } = $props();

  const percent = $derived(Math.round(fraction * 100));
</script>

<div aria-live="polite">
  <Progress.Root
    value={percent}
    max={100}
    class="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
  >
    <div class="h-full bg-primary-600 transition-all" style:width="{percent}%"></div>
  </Progress.Root>
  <p class="mt-1.5 flex items-center gap-1 text-sm text-zinc-500" data-testid="upload-progress">
    {#if done}
      <Check class="size-4 text-emerald-600" aria-hidden="true" /> Uploaded
    {:else}
      Uploading… {percent}%
    {/if}
  </p>
</div>
