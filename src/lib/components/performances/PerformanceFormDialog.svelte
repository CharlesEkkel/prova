<script lang="ts">
  // The dialog that creates a Performance (no `performance`) or edits one: name, start, end and venue,
  // entered in the Choir Time Zone. Creating also takes the major mark and the first Pieces, from a
  // searchable checklist of the Repertoire kept in the order they were ticked. It posts to the
  // Performance actions from whatever page it is on and shows a refusal inside itself.
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { Schema } from 'effect';
  import { choirTimeOf, type ChoirTimeZone } from '../../core/choir-time';
  import { overviewLink, formActions, performanceActionPath } from '../../core/paths';
  import { isPerformanceId, performanceDialogCopy } from '../../core/performances';
  import type { PieceId } from '../../core/pieces';
  import { submitElsewhere, type ElsewhereOutcome } from '../../shell/enhance';
  import type { PerformanceOverview } from '../../shell/performances';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from '../ui/Btn.svelte';
  import CheckRow from '../ui/CheckRow.svelte';
  import Modal from '../ui/Modal.svelte';
  import { fieldLabel, hint, input } from '../ui/styles';

  type RepertoirePiece = {
    readonly id: PieceId;
    readonly title: string;
    readonly composer: string;
  };

  const {
    open,
    onClose,
    performance,
    choirTimeZone,
    repertoire,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    /** The Performance being edited, or null to create one. */
    readonly performance: PerformanceOverview | null;
    readonly choirTimeZone: ChoirTimeZone;
    /** The Pieces a new Performance can start with. */
    readonly repertoire: readonly RepertoirePiece[];
  } = $props();

  const uid = $props.id();
  const copy = $derived(
    performanceDialogCopy(performance === null ? 'new' : 'edit', performance?.name ?? ''),
  );

  let problem = $state<string | undefined>(undefined);
  let search = $state('');
  let ticked = $state<readonly PieceId[]>([]);

  // Each time the dialog opens it starts afresh.
  $effect(() => {
    if (open) {
      problem = undefined;
      search = '';
      ticked = [];
    }
  });

  const shown = $derived(
    repertoire.filter(({ title, composer }) =>
      `${title} ${composer}`.toLowerCase().includes(search.trim().toLowerCase()),
    ),
  );

  const tick = (id: PieceId, on: boolean) => {
    ticked = on ? [...ticked.filter((other) => other !== id), id] : ticked.filter((o) => o !== id);
  };

  const Created = Schema.Struct({ id: Schema.declare(isPerformanceId) });
  const isCreated = Schema.is(Created);

  const done = async (outcome: ElsewhereOutcome) => {
    if (!outcome.ok) {
      problem = outcome.problem;
      return;
    }
    onClose();
    // A new Performance opens its Overview, on the page the Singer is on.
    if (isCreated(outcome.data)) await goto(overviewLink(outcome.data.id));
  };

  const localValue = (moment: Date | undefined): string =>
    moment === undefined ? '' : choirTimeOf(moment, choirTimeZone);
</script>

<Modal {open} {onClose} title={copy.title} description={copy.description}>
  {#if open}
    <form
      id="{uid}-form"
      method="POST"
      action={performanceActionPath(
        performance === null ? formActions.performances.create : formActions.performances.update,
      )}
      use:enhance={submitElsewhere(done)}
      class="flex flex-col gap-5"
    >
      {#if performance !== null}
        <input type="hidden" name="performance" value={performance.id} />
      {/if}
      <div>
        <label for="{uid}-name" class={fieldLabel}>Name</label>
        <input
          id="{uid}-name"
          name="name"
          required
          maxlength="120"
          class={input}
          value={performance?.name ?? ''}
        />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="{uid}-starts" class={fieldLabel}>Starts</label>
          <input
            id="{uid}-starts"
            name="starts"
            type="datetime-local"
            required
            class={input}
            value={localValue(performance?.startsAt)}
          />
        </div>
        <div>
          <label for="{uid}-ends" class={fieldLabel}>Ends</label>
          <input
            id="{uid}-ends"
            name="ends"
            type="datetime-local"
            required
            class={input}
            value={localValue(performance?.endsAt)}
          />
        </div>
      </div>
      <p class="{hint} -mt-3">Times are in the choir’s time zone, {choirTimeZone}.</p>
      <div>
        <label for="{uid}-venue" class={fieldLabel}>Venue (optional)</label>
        <input
          id="{uid}-venue"
          name="venue"
          maxlength="120"
          class={input}
          value={performance?.venue ?? ''}
        />
      </div>

      {#if performance === null}
        <CheckRow
          id="{uid}-major"
          name="major"
          value="on"
          checked={false}
          title="Major Performance"
          detail="Highlighted wherever Performances appear."
        />

        <fieldset class="flex flex-col gap-2">
          <legend class={fieldLabel}>First Pieces (optional)</legend>
          <input
            aria-label="Find Pieces"
            type="search"
            placeholder="Find Pieces"
            class={input}
            bind:value={search}
          />
          <!-- The order ticked is the running order; the checkboxes themselves are not sent. -->
          {#each ticked as id (id)}
            <input type="hidden" name="piece" value={id} />
          {/each}
          <div class="max-h-60 overflow-y-auto">
            {#each shown as piece (piece.id)}
              <CheckRow
                id="{uid}-piece-{piece.id}"
                name="ticked"
                value={piece.id}
                checked={ticked.includes(piece.id)}
                onChange={(on: boolean) => {
                  tick(piece.id, on);
                }}
                title={piece.title}
                detail={ticked.includes(piece.id)
                  ? `${piece.composer} · number ${(ticked.indexOf(piece.id) + 1).toString()}`
                  : piece.composer}
              />
            {:else}
              <p class="px-2 py-2 text-sm text-zinc-500">No Pieces match.</p>
            {/each}
          </div>
        </fieldset>
      {/if}

      {#if problem !== undefined}
        <AlertMessage>{problem}</AlertMessage>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    <Btn variant="ghost" onclick={onClose}>Cancel</Btn>
    <Btn type="submit" form="{uid}-form">{copy.submit}</Btn>
  {/snippet}
</Modal>
