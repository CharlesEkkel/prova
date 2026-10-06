<script lang="ts">
  // Shared dialog chrome: a bottom sheet on phones, a centred card from `sm` up. `alert` uses Bits' AlertDialog
  // (no click-outside dismissal) for destructive confirmations.
  import { AlertDialog, Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';
  let { open, onclose, title, description = '', alert = false, wide = false, children, footer }: { open: boolean; onclose: () => void; title: string; description?: string; alert?: boolean; wide?: boolean; children: Snippet; footer?: Snippet } = $props();
  const D = $derived(alert ? AlertDialog : Dialog);
</script>

<D.Root {open} onOpenChange={(o) => !o && onclose()}>
  <D.Portal>
    <D.Overlay class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
    <D.Content class="fixed inset-x-0 bottom-0 z-[60] flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full {wide ? 'sm:max-w-xl' : 'sm:max-w-md'} sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl dark:bg-zinc-900">
      <div class="p-5 pb-2">
        <D.Title class="text-lg font-semibold tracking-tight">{title}</D.Title>
        <D.Description class="text-sm text-zinc-500 {description ? '' : 'sr-only'}">{description || title}</D.Description>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-2">{@render children()}</div>
      {#if footer}<div class="flex flex-wrap justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">{@render footer()}</div>{/if}
    </D.Content>
  </D.Portal>
</D.Root>
