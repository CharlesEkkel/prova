<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dialog } from 'bits-ui';

  type Props = {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title: string;
    readonly description?: string | undefined;
    readonly children: Snippet;
  };

  const { open, onClose, title, description, children }: Props = $props();
</script>

<Dialog.Root
  {open}
  onOpenChange={(next) => {
    if (!next) onClose();
  }}
>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 bg-black/50" />
    <Dialog.Content
      class="fixed top-1/2 left-1/2 flex max-h-[90dvh] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4 text-slate-900 shadow-lg dark:bg-slate-800 dark:text-slate-100"
    >
      <Dialog.Title class="text-lg font-semibold">{title}</Dialog.Title>
      {#if description !== undefined}
        <Dialog.Description class="text-sm opacity-80">{description}</Dialog.Description>
      {/if}
      {@render children()}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
