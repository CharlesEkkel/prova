<script lang="ts">
  // Upload a Practice Track: pick the Voice Part (or Combined), whether it is part-only or part-predominant,
  // an optional label, and the audio file. Validation here is the prototype's version of "decode once at the edge".
  import { Progress, RadioGroup, ToggleGroup } from 'bits-ui';
  import Check from '@lucide/svelte/icons/check';
  import { SINGER, VOICE_PARTS, piece, type TrackKind, type VoicePart } from '../data.svelte';
  import Btn from '../ui/Btn.svelte';
  import FileField from '../ui/FileField.svelte';
  import Modal from '../ui/Modal.svelte';
  import { errorText, fieldLabel, hint, input } from '../ui/styles';
  import { addTrack, closeManage } from '../manage.svelte';
  import { MB, fakeUpload } from './fakeUpload';
  let { pieceId }: { pieceId: string } = $props();
  // svelte-ignore state_referenced_locally (mounted fresh for each open, so props are read once on purpose)
  const p = piece(pieceId);
  const MAX = 50 * MB;

  let part = $state<string>(SINGER.part);
  let kind = $state<string>('part-predominant');
  let label = $state('');
  let file = $state<File | null>(null);
  let pct = $state(0);
  let phase = $state<'idle' | 'uploading' | 'done'>('idle');

  const error = $derived(!file ? '' : !file.type.startsWith('audio/') ? 'That is not an audio file. Practice Tracks are audio (MP3, M4A, WAV…).' : file.size > MAX ? `That file is ${(file.size / MB).toFixed(0)} MB. Practice Tracks are capped at 50 MB.` : '');
  const combined = $derived(part === 'All');
  const ready = $derived(file !== null && error === '' && phase === 'idle');
  const toggle = 'grid h-11 flex-1 place-items-center rounded-xl text-sm font-bold text-zinc-600 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:text-zinc-400 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900';
  const radio = 'flex w-full min-h-14 items-center gap-3 rounded-xl border border-zinc-300 px-3 text-left data-[state=checked]:border-violet-500 data-[state=checked]:bg-violet-50 dark:border-zinc-700 dark:data-[state=checked]:bg-violet-500/10';

  function upload() {
    if (!ready) return;
    phase = 'uploading';
    fakeUpload(
      (v) => (pct = v),
      () => {
        phase = 'done';
        addTrack(pieceId, { part: combined ? undefined : (part as VoicePart), kind: combined ? 'combined' : (kind as TrackKind), label: label.trim() || undefined, durationSec: 140 + Math.round(Math.random() * 120) });
        setTimeout(closeManage, 700);
      }
    );
  }
</script>

<Modal open onclose={closeManage} title="Upload Practice Track" description="For “{p?.title}”. Uploads add a new track; they never change existing ones.">
  <div class="flex flex-col gap-5">
    <div>
      <span class={fieldLabel}>Voice Part</span>
      <ToggleGroup.Root type="single" value={part} onValueChange={(v) => v && (part = v)} aria-label="Voice Part" class="flex gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800">
        {#each VOICE_PARTS as v (v)}<ToggleGroup.Item value={v} aria-label={v} disabled={phase !== 'idle'} class={toggle}>{v[0]}</ToggleGroup.Item>{/each}
        <ToggleGroup.Item value="All" aria-label="All parts (Combined Track)" disabled={phase !== 'idle'} class="{toggle} !flex-[1.4]">ALL</ToggleGroup.Item>
      </ToggleGroup.Root>
      <p class={hint}>{combined ? 'A Combined Track has every Voice Part together.' : `Just for ${part}.`}</p>
    </div>

    {#if !combined}
      <div>
        <span class={fieldLabel}>What does it sound like?</span>
        <RadioGroup.Root value={kind} onValueChange={(v) => (kind = v)} aria-label="Track type" class="flex flex-col gap-2">
          <RadioGroup.Item value="part-only" class={radio}><span><b class="block text-sm">Part only</b><span class="text-xs text-zinc-500">Just that line, nothing else</span></span></RadioGroup.Item>
          <RadioGroup.Item value="part-predominant" class={radio}><span><b class="block text-sm">Part-predominant</b><span class="text-xs text-zinc-500">That line louder, over the rest</span></span></RadioGroup.Item>
        </RadioGroup.Root>
      </div>
    {/if}

    <div>
      <label for="track-label" class={fieldLabel}>Label <span class="font-normal text-zinc-500">(optional)</span></label>
      <input id="track-label" class={input} bind:value={label} placeholder="e.g. Rehearsal 3 mix" disabled={phase !== 'idle'} />
    </div>

    <div>
      <span class={fieldLabel}>Audio file</span>
      <FileField accept="audio/*" bind:file disabled={phase !== 'idle'} />
      {#if error}<p class={errorText} role="alert">{error}</p>{:else}<p class={hint}>Up to 50 MB.</p>{/if}
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
