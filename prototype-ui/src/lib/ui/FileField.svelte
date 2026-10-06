<script lang="ts">
  import Upload from '@lucide/svelte/icons/upload';
  let { accept, file = $bindable(null), disabled = false }: { accept: string; file?: File | null; disabled?: boolean } = $props();
  const size = $derived(file ? (file.size / 1024 / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 2) + ' MB' : '');
</script>

<label class="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 p-4 text-center text-sm transition hover:border-violet-400 hover:bg-violet-50/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-violet-500 dark:border-zinc-700 dark:hover:bg-violet-500/5 {disabled ? 'pointer-events-none opacity-60' : ''}">
  <Upload class="size-5 text-zinc-400" />
  {#if file}<span class="font-medium break-all">{file.name}</span><span class="text-xs text-zinc-500">{size}</span>{:else}<span class="font-medium">Choose a file</span><span class="text-xs text-zinc-500">or drop it here</span>{/if}
  <input type="file" {accept} {disabled} class="sr-only" onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)} />
</label>
