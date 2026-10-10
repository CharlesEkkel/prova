<script lang="ts">
  // "Add to a Performance…" from a Piece's menu: every Performance, upcoming first, with those the
  // Piece is already in ticked and disabled. The Piece goes to the end of each one ticked.
  import { enhance } from '$app/forms';
  import type { ChoirTimeZone } from '../../core/choir-time';
  import { formActions, performanceActionPath } from '../../core/paths';
  import { performanceWhen, type AddToPerformanceChoice } from '../../core/performances';
  import type { PieceId } from '../../core/pieces';
  import { submitElsewhere, type ElsewhereOutcome } from '../../shell/enhance';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from '../ui/Btn.svelte';
  import CheckRow from '../ui/CheckRow.svelte';
  import Modal from '../ui/Modal.svelte';

  const {
    open,
    onClose,
    pieceId,
    pieceTitle,
    choices,
    choirTimeZone,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly pieceId: PieceId;
    readonly pieceTitle: string;
    readonly choices: readonly AddToPerformanceChoice[];
    readonly choirTimeZone: ChoirTimeZone;
  } = $props();

  const uid = $props.id();
  let problem = $state<string | undefined>(undefined);

  // Each time the dialog opens it starts afresh.
  $effect(() => {
    if (open) problem = undefined;
  });

  const done = (outcome: ElsewhereOutcome) => {
    if (outcome.ok) onClose();
    else problem = outcome.problem;
  };

  const detailOf = (choice: AddToPerformanceChoice): string =>
    [
      performanceWhen(choice.startsAt, choice.endsAt, choirTimeZone),
      ...(choice.archived ? ['archived'] : []),
      ...(choice.alreadyIn ? ['already in it'] : []),
    ].join(' · ');
</script>

<Modal
  {open}
  {onClose}
  title="Add to a Performance"
  description="Add {pieceTitle} to the end of each Performance you tick."
>
  {#if open}
    <form
      id="{uid}-form"
      method="POST"
      action={performanceActionPath(formActions.performances.addPiece)}
      use:enhance={submitElsewhere(done)}
      class="flex flex-col gap-1"
    >
      <input type="hidden" name="piece" value={pieceId} />
      {#each choices as choice (choice.id)}
        <CheckRow
          id="{uid}-{choice.id}"
          name="in"
          value={choice.id}
          checked={choice.alreadyIn}
          disabled={choice.alreadyIn}
          title={choice.name}
          detail={detailOf(choice)}
        />
      {:else}
        <p class="py-2 text-sm text-zinc-500">There are no Performances yet.</p>
      {/each}
      {#if problem !== undefined}
        <div class="mt-3"><AlertMessage>{problem}</AlertMessage></div>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={onClose}>Cancel</Btn>
    <Btn type="submit" form="{uid}-form">Add</Btn>
  {/snippet}
</Modal>
