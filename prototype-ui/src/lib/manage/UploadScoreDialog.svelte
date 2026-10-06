<script lang="ts">
  // Upload a Score (PDF). One Score per Piece is the choir score, the one shown to Singers during playback.
  import { Checkbox, Label, Progress } from 'bits-ui';
  import Check from '@lucide/svelte/icons/check';
  import { piece } from '../data.svelte';
  import Btn from '../ui/Btn.svelte';
  import FileField from '../ui/FileField.svelte';
  import Modal from '../ui/Modal.svelte';
  import { errorText, fieldLabel, hint, input } from '../ui/styles';
  import { addScore, closeManage } from '../manage.svelte';
  import { MB, fakeUpload } from './fakeUpload';
  let { pieceId }: { pieceId: string } = $props();
  // svelte-ignore state_referenced_locally (mounted fresh for each open, so props are read once on purpose)
  const p = piece(pieceId);
  const MAX = 20 * MB;
  // svelte-ignore state_referenced_locally (mounted fresh for each open, so props are read once on purpose)
  const hasChoir = p?.scores.some((s) => s.choir) ?? false;

  let label = $state('');
  let choir = $state(!hasChoir);
  let file = $state<File | null>(null);
  let pct = $state(0);
  let phase = $state<'idle' | 'uploading' | 'done'>('idle');

  const error = $derived(!file ? '' : file.type !== 'application/pdf' ? 'That is not a PDF. Scores are uploaded as PDF files.' : file.size > MAX ? `That file is ${(file.size / MB).toFixed(0)} MB. Scores are capped at 20 MB.` : '');
  const name = $derived(label.trim() || (file ? file.name.replace(/\.pdf$/i, '') : ''));
  const ready = $derived(file !== null && error === '' && name !== '' && phase === 'idle');

  function upload() {
    if (!ready) return;
    phase = 'uploading';
    fakeUpload(
      (v) => (pct = v),
      () => {
        phase = 'done';
        addScore(pieceId, name, choir, '/scores/sample.pdf'); // the prototype shows its one sample PDF for every Score
        setTimeout(closeManage, 700);
      }
    );
  }
</script>

<Modal open onclose={closeManage} title="Upload Score" description="For “{p?.title}”. A Piece can have several, including instrumental Scores.">
  <div class="flex flex-col gap-5">
    <div>
      <span class={fieldLabel}>PDF file</span>
      <FileField accept="application/pdf" bind:file disabled={phase !== 'idle'} />
      {#if error}<p class={errorText} role="alert">{error}</p>{:else}<p class={hint}>Up to 20 MB.</p>{/if}
    </div>
    <div>
      <label for="score-label" class={fieldLabel}>Label</label>
      <input id="score-label" class={input} bind:value={label} placeholder={file ? file.name.replace(/\.pdf$/i, '') : 'e.g. Piano reduction'} disabled={phase !== 'idle'} />
    </div>
    <div class="flex items-start gap-3">
      <Checkbox.Root id="choir-score" bind:checked={choir} disabled={phase !== 'idle'} class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-zinc-400 data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600 dark:border-zinc-600">
        {#snippet children({ checked })}{#if checked}<Check class="size-4 text-white" />{/if}{/snippet}
      </Checkbox.Root>
      <Label.Root for="choir-score" class="text-sm"><b class="block">Make this the choir score</b><span class="text-zinc-500">{hasChoir ? 'Replaces the current choir score, the one Singers see during playback.' : 'The one Singers see during playback.'}</span></Label.Root>
    </div>
    {#if phase !== 'idle'}
      <div aria-live="polite">
        <Progress.Root value={pct} max={100} class="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><div class="h-full bg-violet-600 transition-all" style:width="{pct}%"></div></Progress.Root>
        <p class="mt-1.5 flex items-center gap-1 text-sm text-zinc-500">{#if phase === 'done'}<Check class="size-4 text-emerald-600" /> Uploaded{:else}Uploading… {Math.round(pct)}%{/if}</p>
      </div>
    {/if}
  </div>
  {#snippet footer()}
    <Btn variant="ghost" onclick={closeManage} disabled={phase === 'uploading'}>Cancel</Btn>
    <Btn onclick={upload} disabled={!ready}>Upload</Btn>
  {/snippet}
</Modal>
