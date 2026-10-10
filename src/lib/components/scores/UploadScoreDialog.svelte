<script lang="ts">
  // Upload a Score: a PDF, a label (which starts as the file's name) and, where the Singer may, "make
  // this the choir score". It says the accepted type and the limit before a file is chosen, checks the
  // file before sending, and shows progress. The file goes to the bucket first; then the Score is
  // registered (see ADR 0003).
  import { refreshAll } from '$app/navigation';
  import { Progress } from 'bits-ui';
  import { Check } from '@lucide/svelte';
  import type { PieceId } from '../../core/pieces';
  import { defaultScoreLabel, scoreLabelMaxLength, type ChoirChoice } from '../../core/scores';
  import {
    acceptedScoreExtensions,
    acceptedScoreTypesText,
    scoreUploadRules,
  } from '../../core/upload-rules';
  import { uploadScore } from '../../shell/upload-score';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from '../ui/Btn.svelte';
  import CheckRow from '../ui/CheckRow.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, hint, input } from '../ui/styles';

  const {
    open,
    onClose,
    pieceId,
    pieceTitle,
    choirChoice,
    limitMiB,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly pieceId: PieceId;
    readonly pieceTitle: string;
    /** Whether "make this the choir score" is offered, and whether it starts ticked. */
    readonly choirChoice: ChoirChoice;
    readonly limitMiB: number;
  } = $props();

  type Phase = 'idle' | 'working' | 'done';

  let file = $state<File | null>(null);
  let label = $state('');
  let labelEdited = $state(false);
  let makeChoir = $state(false);
  let fraction = $state(0);
  let phase = $state<Phase>('idle');
  let failure = $state('');

  // A fresh form each time the dialog opens.
  $effect(() => {
    if (!open) return;
    file = null;
    label = '';
    labelEdited = false;
    makeChoir = choirChoice === 'on';
    fraction = 0;
    phase = 'idle';
    failure = '';
  });

  const rules = $derived(scoreUploadRules(limitMiB));
  const check = $derived(file === null ? null : rules.check(file));
  const fileProblem = $derived(check === null || check.ok ? '' : rules.messages[check.problem]);
  const ready = $derived(check?.ok === true && label.trim() !== '' && phase === 'idle');

  const submit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (!ready || file === null || check?.ok !== true) return;
    phase = 'working';
    failure = '';
    fraction = 0;
    const outcome = await uploadScore(
      {
        pieceId,
        file,
        accepted: check.accepted,
        label,
        makeChoirScore: choirChoice !== 'unavailable' && makeChoir,
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
  title="Upload Score"
  description="For {pieceTitle}. An upload adds a new Score; it never changes an existing one."
>
  <form id="upload-score-form" class="flex flex-col gap-5" onsubmit={submit}>
    <div>
      <label for="score-file" class={fieldLabel}>PDF file</label>
      <input
        id="score-file"
        type="file"
        accept={acceptedScoreExtensions}
        disabled={phase !== 'idle'}
        class="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-primary-100 file:px-4 file:font-medium file:text-primary-700 dark:file:bg-primary-500/15 dark:file:text-primary-300"
        onchange={(event) => {
          file = event.currentTarget.files?.[0] ?? null;
          failure = '';
          if (!labelEdited && file !== null) label = defaultScoreLabel(file.name);
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
          {acceptedScoreTypesText}, up to {rules.limitText}.
        </p>
      {/if}
    </div>

    <div>
      <label for="score-label" class={fieldLabel}>Label</label>
      <input
        id="score-label"
        class={input}
        bind:value={label}
        oninput={() => {
          labelEdited = true;
        }}
        maxlength={scoreLabelMaxLength}
        placeholder="e.g. Full score, Piano reduction"
        disabled={phase !== 'idle'}
      />
      <p class={hint}>Starts as the file’s name.</p>
    </div>

    {#if choirChoice !== 'unavailable'}
      <CheckRow
        id="score-choir"
        name="choir"
        value="on"
        checked={makeChoir}
        disabled={phase !== 'idle'}
        onChange={(next) => {
          makeChoir = next;
        }}
        title="Make this the choir score"
        detail={choirChoice === 'on'
          ? 'The one the choir treats as its own. This Piece has none yet.'
          : 'Replaces this Piece’s current choir score, which stays as an ordinary Score.'}
      />
    {/if}

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
    <Btn type="submit" form="upload-score-form" disabled={!ready}>Upload</Btn>
  {/snippet}
</Modal>
