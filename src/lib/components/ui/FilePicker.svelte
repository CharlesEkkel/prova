<script lang="ts">
  // A file field for the upload dialogs: its label, the Browse button, and underneath either what is
  // wrong with the chosen file or what may be uploaded (types and size limit), so a Singer knows both
  // before choosing and as soon as they have.
  import { fieldLabel, fileInput, hint } from './styles';

  const {
    id,
    label,
    accept,
    disabled,
    problem,
    rulesText,
    onPick,
  }: {
    readonly id: string;
    readonly label: string;
    /** The extensions the picker offers, for `accept`. */
    readonly accept: string;
    readonly disabled: boolean;
    /** What is wrong with the chosen file, or empty. */
    readonly problem: string;
    /** What may be uploaded: "PDF, up to 20 MB." */
    readonly rulesText: string;
    /** Told which file was chosen, or null when the choice was cleared. */
    readonly onPick: (file: File | null) => void;
  } = $props();
</script>

<div>
  <label for={id} class={fieldLabel}>{label}</label>
  <input
    {id}
    type="file"
    {accept}
    {disabled}
    class={fileInput}
    onchange={(event) => {
      onPick(event.currentTarget.files?.[0] ?? null);
    }}
  />
  {#if problem !== ''}
    <p
      class="mt-1.5 text-sm text-red-600 dark:text-red-400"
      role="alert"
      data-testid="file-problem"
    >
      {problem}
    </p>
  {:else}
    <p class={hint} data-testid="upload-rules">{rulesText}</p>
  {/if}
</div>
