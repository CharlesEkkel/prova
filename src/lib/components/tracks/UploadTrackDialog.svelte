<script lang="ts">
  // Upload a Practice Track: the Voice Part (or All for a Combined Track), for a part whether it is
  // part-only or part-predominant (required), an optional label, and the audio file. It says the
  // accepted types and the limit before a file is chosen, checks the file before sending, and shows
  // progress. The file goes to the bucket first; then the track is registered (see ADR 0003).
  import { refreshAll } from '$app/navigation';
  import { Progress, RadioGroup, ToggleGroup } from 'bits-ui';
  import { Check } from '@lucide/svelte';
  import type { PieceId } from '../../core/pieces';
  import {
    kindDescription,
    kindText,
    trackKinds,
    trackLabelMaxLength,
    type TrackKind,
  } from '../../core/practice-tracks';
  import { acceptedExtensions, acceptedTypesText, uploadRules } from '../../core/upload-rules';
  import { combinedTrackLabel } from '../../core/voice-parts';
  import { uploadPracticeTrack } from '../../shell/upload-track';
  import type { VoicePart } from '../../shell/voice-parts';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from '../ui/Btn.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, fileInput, hint, input } from '../ui/styles';

  const {
    open,
    onClose,
    pieceId,
    pieceTitle,
    voiceParts,
    defaultPartId,
    limitMiB,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly pieceId: PieceId;
    readonly pieceTitle: string;
    readonly voiceParts: readonly VoicePart[];
    /** The Voice Part to start on: the Singer's own. */
    readonly defaultPartId: string | null;
    readonly limitMiB: number;
  } = $props();

  const combinedKey = 'all';
  type Phase = 'idle' | 'working' | 'done';

  let part = $state(combinedKey);
  let kind = $state<TrackKind | ''>('');
  let label = $state('');
  let file = $state<File | null>(null);
  let fraction = $state(0);
  let phase = $state<Phase>('idle');
  let failure = $state('');

  // A fresh form each time the dialog opens.
  $effect(() => {
    if (!open) return;
    part = defaultPartId ?? combinedKey;
    kind = '';
    label = '';
    file = null;
    fraction = 0;
    phase = 'idle';
    failure = '';
  });

  const combined = $derived(part === combinedKey);
  const rules = $derived(uploadRules(limitMiB));
  const check = $derived(file === null ? null : rules.check(file));
  const fileProblem = $derived(check === null || check.ok ? '' : rules.messages[check.problem]);
  const ready = $derived(check?.ok === true && (combined || kind !== '') && phase === 'idle');
  const partName = $derived(voiceParts.find(({ id }) => id === part)?.name ?? '');

  const toggle =
    'grid h-11 min-w-11 flex-1 place-items-center rounded-xl px-2 text-sm font-bold text-zinc-600 disabled:opacity-50 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:text-zinc-400 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900';
  const radio =
    'flex min-h-14 w-full items-center gap-3 rounded-xl border border-zinc-300 px-3 text-left data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-50 disabled:opacity-50 dark:border-zinc-700 dark:data-[state=checked]:bg-primary-500/10';

  const submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (!ready || file === null || check?.ok !== true) return;
    phase = 'working';
    failure = '';
    fraction = 0;
    const outcome = await uploadPracticeTrack(
      {
        pieceId,
        file,
        accepted: check.accepted,
        voicePartId: combined ? null : part,
        kind,
        label,
        rules,
      },
      (value) => {
        fraction = value;
      },
    );
    if (!outcome.ok) {
      failure = outcome.message;
      phase = 'idle';
      return;
    }
    phase = 'done';
    await refreshAll();
    onClose();
  };
</script>

<Modal
  {open}
  onClose={() => {
    if (phase !== 'working') onClose();
  }}
  title="Upload Practice Track"
  description="For {pieceTitle}. An upload adds a new track; it never changes an existing one."
>
  <form id="upload-track-form" class="flex flex-col gap-5" onsubmit={submit}>
    <div>
      <span class={fieldLabel} id="upload-part-label">Voice Part</span>
      <ToggleGroup.Root
        type="single"
        value={part}
        onValueChange={(next) => {
          if (next !== '') part = next;
        }}
        disabled={phase !== 'idle'}
        aria-labelledby="upload-part-label"
        class="flex flex-wrap gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800"
      >
        {#each voiceParts as voicePart (voicePart.id)}
          <ToggleGroup.Item value={voicePart.id} aria-label={voicePart.name} class={toggle}
            >{voicePart.shortLabel}</ToggleGroup.Item
          >
        {/each}
        <ToggleGroup.Item
          value={combinedKey}
          aria-label="All parts (a Combined Track)"
          class="{toggle} flex-[1.4]!">{combinedTrackLabel}</ToggleGroup.Item
        >
      </ToggleGroup.Root>
      <p class={hint}>
        {combined ? 'A Combined Track has every Voice Part together.' : `Just for ${partName}.`}
      </p>
    </div>

    {#if !combined}
      <div>
        <span class={fieldLabel} id="upload-kind-label">What does it sound like?</span>
        <RadioGroup.Root
          bind:value={kind}
          disabled={phase !== 'idle'}
          aria-labelledby="upload-kind-label"
          class="flex flex-col gap-2"
        >
          {#each trackKinds as option (option)}
            <RadioGroup.Item value={option} class={radio}>
              <span>
                <b class="block text-sm"
                  >{kindText({ type: 'part', voicePartId: '', kind: option })}</b
                >
                <span class="text-xs text-zinc-500">{kindDescription[option]}</span>
              </span>
            </RadioGroup.Item>
          {/each}
        </RadioGroup.Root>
      </div>
    {/if}

    <div>
      <label for="track-label" class={fieldLabel}>
        Label <span class="font-normal text-zinc-500">(optional)</span>
      </label>
      <input
        id="track-label"
        class={input}
        bind:value={label}
        maxlength={trackLabelMaxLength}
        placeholder="e.g. slow tempo"
        disabled={phase !== 'idle'}
      />
    </div>

    <div>
      <label for="track-file" class={fieldLabel}>Audio file</label>
      <input
        id="track-file"
        type="file"
        accept={acceptedExtensions}
        disabled={phase !== 'idle'}
        class={fileInput}
        onchange={(event) => {
          file = event.currentTarget.files?.[0] ?? null;
          failure = '';
        }}
      />
      {#if fileProblem !== ''}
        <p
          class="mt-1.5 text-sm text-red-600 dark:text-red-400"
          role="alert"
          data-testid="file-problem"
        >
          {fileProblem}
        </p>
      {:else}
        <p class={hint} data-testid="upload-rules">
          {acceptedTypesText}, up to {rules.limitText}.
        </p>
      {/if}
    </div>

    {#if phase !== 'idle'}
      <div aria-live="polite">
        <Progress.Root
          value={Math.round(fraction * 100)}
          max={100}
          class="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        >
          <div
            class="h-full bg-primary-600 transition-all"
            style:width="{Math.round(fraction * 100)}%"
          ></div>
        </Progress.Root>
        <p
          class="mt-1.5 flex items-center gap-1 text-sm text-zinc-500"
          data-testid="upload-progress"
        >
          {#if phase === 'done'}
            <Check class="size-4 text-emerald-600" aria-hidden="true" /> Uploaded
          {:else}
            Uploading… {Math.round(fraction * 100)}%
          {/if}
        </p>
      </div>
    {/if}

    {#if failure !== ''}
      <AlertMessage>{failure}</AlertMessage>
    {/if}
  </form>
  {#snippet footer()}
    <Btn variant="ghost" onclick={onClose} disabled={phase === 'working'}>Cancel</Btn>
    <Btn type="submit" form="upload-track-form" disabled={!ready}>Upload</Btn>
  {/snippet}
</Modal>
