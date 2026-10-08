<script lang="ts">
  // Shared dialog chrome: a bottom sheet on phones, a centred card from `sm` up. `alert` uses Bits'
  // AlertDialog (no click-outside dismissal) for destructive confirmations.
  import { AlertDialog, Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  const {
    open,
    onClose,
    title,
    description = '',
    alert = false,
    children,
    footer,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title: string;
    readonly description?: string;
    readonly alert?: boolean;
    readonly children?: Snippet;
    readonly footer?: Snippet;
  } = $props();

  const Dialogish = $derived(alert ? AlertDialog : Dialog);
</script>

<Dialogish.Root
  {open}
  onOpenChange={(next) => {
    if (!next) onClose();
  }}
>
  <Dialogish.Portal>
    <Dialogish.Overlay class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
    <Dialogish.Content
      class="fixed inset-x-0 bottom-0 z-[60] flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl dark:bg-zinc-900"
    >
      <div class="p-5 pb-2">
        <Dialogish.Title class="text-lg font-semibold tracking-tight">{title}</Dialogish.Title>
        <Dialogish.Description class="text-sm text-zinc-500 {description ? '' : 'sr-only'}">
          {description || title}
        </Dialogish.Description>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-2">{@render children?.()}</div>
      {#if footer}
        <div class="flex flex-wrap justify-end gap-2 border-t p-4">{@render footer()}</div>
      {/if}
    </Dialogish.Content>
  </Dialogish.Portal>
</Dialogish.Root>
