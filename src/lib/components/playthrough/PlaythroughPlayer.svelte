<script lang="ts">
  // The Play-through player: plays a Performance's Pieces in order, from the first, as soon as it
  // opens, and moves on as each one ends. Where it goes on each move is decided in core
  // (playthrough-run.ts); this screen only plays what the run says. The audio belongs to the
  // PlaybackScope around it, which stops it when the Singer leaves.
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { Play, RotateCcw } from '@lucide/svelte';
  import { playthroughPath, trackAudioPath } from '../../core/paths';
  import type { PerformanceId } from '../../core/performances';
  import {
    choiceOptions,
    defaultChoice,
    resolvePlaythrough,
    selectedPart,
    trackForChoice,
    type PartChoice,
    type PlaythroughOptions,
  } from '../../core/playthrough';
  import {
    advanceRun,
    isRestart,
    startRun,
    upNext,
    type RunEvent,
    type RunPiece,
    type RunState,
  } from '../../core/playthrough-run';
  import { indicatorText, partNamesOf, type PracticeTrack } from '../../core/practice-tracks';
  import type { AudioPlayer } from '../../shell/audio-player.svelte';
  import { setPlaythroughOptions } from '../../shell/playthrough-options-adapter';
  import type { VoicePart } from '../../shell/voice-parts';
  import AlertMessage from '../AlertMessage.svelte';
  import ScoreRow from '../scores/ScoreRow.svelte';
  import ScoreViewer from '../scores/ScoreViewer.svelte';
  import PartIndicator from '../tracks/PartIndicator.svelte';
  import PlayerControls from '../tracks/PlayerControls.svelte';
  import Btn from '../ui/Btn.svelte';
  import OptionsPopover from './OptionsPopover.svelte';
  import RunningOrder from './RunningOrder.svelte';

  const {
    performance,
    pieces,
    voiceParts,
    voicePartId,
    initialOptions,
    overview,
    player,
  }: {
    readonly performance: { readonly id: PerformanceId; readonly name: string };
    readonly pieces: readonly RunPiece[];
    readonly voiceParts: readonly VoicePart[];
    /** The Singer's default Voice Part. */
    readonly voicePartId: string;
    /** The options the address carries. */
    readonly initialOptions: PlaythroughOptions;
    /** The Performance's Overview, to go back to. */
    readonly overview: string;
    readonly player: AudioPlayer;
  } = $props();

  // The run plays the Pieces as they were when it opened, even if the page's data is reloaded.
  const runPieces = untrack(() => pieces);
  let options = $state<PlaythroughOptions>(untrack(() => initialOptions));
  const nameOf = $derived(partNamesOf(voiceParts));
  const entries = $derived(resolvePlaythrough(runPieces, voicePartId, nameOf, options));
  let run = $state<RunState<RunPiece>>(untrack(() => startRun(entries)));
  const move = (event: RunEvent): void => {
    run = advanceRun(run, event, entries);
  };
  const toNext = (): void => {
    move({ type: 'next' });
  };
  const toPrevious = (): void => {
    move({ type: 'previous', playedSeconds: player.position });
  };

  const at = $derived(run.kind === 'at' ? run : null);
  const piece = $derived(at?.entry.piece ?? null);
  const next = $derived(upNext(run, entries));

  // A part picked in the indicator plays once, on this Piece only (a restart of it keeps it). With
  // none picked, the Piece plays what the run arrived with, so an option changed meanwhile applies
  // from the next Piece. A picked part does not depend on the options.
  let choice = $state<PartChoice>(defaultChoice);
  const track = $derived.by((): PracticeTrack | undefined => {
    if (at === null) return undefined;
    if (choice.type !== 'default')
      return trackForChoice(at.entry.piece.tracks, voicePartId, choice, options);
    return at.entry.kind === 'play' ? at.entry.track : undefined;
  });
  const offered = $derived(choiceOptions(piece?.tracks ?? []));
  const selected = $derived(selectedPart(track));

  const play = (found: PracticeTrack, of: RunPiece): Promise<void> =>
    player.start(trackAudioPath(of.id, found.id), found.durationSeconds);

  const playCurrent = async (): Promise<void> => {
    if (track !== undefined && piece !== null) await play(track, piece);
  };

  const choose = async (next: PartChoice): Promise<void> => {
    choice = next;
    await playCurrent();
  };

  // The choir score, opened only when the Singer asks. While open it follows the run to each
  // Piece's choir score, and closes when there is none, at a pause, or when the run is over.
  let viewing = $state(false);

  // Every arrival (a new take) plays the Piece from the start. Moving to another Piece forgets the
  // play-once choice; restarting this one keeps it.
  let before: RunState<RunPiece> = { kind: 'nothing' };
  let handledTake = -1;
  $effect(() => {
    const take = run.kind === 'nothing' ? 0 : run.take;
    if (take === handledTake) return;
    handledTake = take;
    untrack(() => {
      if (!isRestart(before, run)) choice = defaultChoice;
      before = run;
      if (at === null || track === undefined) {
        player.pause();
        viewing = false;
        return;
      }
      if (at.entry.piece.choirScore === null) viewing = false;
      void playCurrent();
    });
  });

  // A track that plays to its end moves the run on, once.
  let sawEnd = false;
  $effect(() => {
    const ended = player.ended;
    if (ended && !sawEnd) {
      untrack(toNext);
    }
    sawEnd = ended;
  });

  const changeOptions = (changed: PlaythroughOptions): void => {
    options = changed;
    void setPlaythroughOptions(changed);
    // A reload keeps the options, without a new history entry for each flip.
    void goto(playthroughPath(performance.id, changed), {
      state: {},
      shallow: true,
      replace: true,
    });
  };
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
  <div class="flex items-center justify-between gap-2">
    <a
      href={overview}
      aria-label="Back to the Overview"
      class="inline-flex min-h-11 items-center text-sm text-zinc-500"
    >
      ← {performance.name}
    </a>
    <OptionsPopover {options} onChange={changeOptions} />
  </div>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div class="flex flex-col gap-4">
      {#if run.kind === 'nothing'}
        <div class="rounded-3xl border p-6 text-center">
          <h1 class="text-lg font-semibold">Nothing to play in this Play-through</h1>
          <p class="mt-1 text-sm text-zinc-500">
            {runPieces.length === 0
              ? 'This Performance has no Pieces yet.'
              : 'Every Piece is skipped.'}
          </p>
          <Btn href={overview} variant="soft" class="mt-4">Back to the Overview</Btn>
        </div>
      {:else if run.kind === 'finished'}
        <div class="rounded-3xl border p-6 text-center">
          <h1 class="text-lg font-semibold">That’s the end of {performance.name}</h1>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <Btn
              onclick={() => {
                move({ type: 'restart' });
              }}><RotateCcw class="size-5" /> Play it again</Btn
            >
            <Btn href={overview} variant="outline">Back to the Overview</Btn>
          </div>
        </div>
      {:else if at !== null && piece !== null}
        <div
          data-testid="player"
          class="flex flex-col gap-4 rounded-3xl border bg-white p-5 dark:bg-zinc-900"
        >
          <div>
            <p class="text-sm text-zinc-500">Piece {at.index + 1} of {entries.length}</p>
            <h1 class="text-2xl font-semibold tracking-tight">{piece.title}</h1>
            <p class="text-zinc-500">{piece.composer}</p>
          </div>

          {#if piece.tracks.length > 0}
            <div>
              <PartIndicator
                text={track === undefined ? 'Choose a track' : indicatorText(track.source, nameOf)}
                {voiceParts}
                hasCombined={offered.hasCombined}
                voicePartIds={offered.voicePartIds}
                {selected}
                onChoose={choose}
              />
            </div>
          {/if}

          {#if track === undefined}
            <div
              data-testid="pause-card"
              class="rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
            >
              <p class="font-medium">{at.entry.heard.text}</p>
              <p class="text-sm text-zinc-500">
                {piece.tracks.length === 0
                  ? 'This Piece has no Practice Tracks yet.'
                  : 'Choose a track above to play it once, or carry on.'}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <Btn variant="outline" onclick={toPrevious}>Previous Piece</Btn>
                <Btn onclick={toNext}>Continue to next Piece</Btn>
              </div>
            </div>
          {:else if player.failed}
            <AlertMessage>That track could not be played.</AlertMessage>
            <div class="flex flex-wrap gap-2">
              <Btn onclick={playCurrent}>Retry</Btn>
              <Btn variant="outline" onclick={toNext}>Continue to next Piece</Btn>
            </div>
          {:else if player.blocked}
            <Btn onclick={playCurrent} class="self-start"
              ><Play class="size-5 fill-current" /> Start</Btn
            >
          {/if}

          {#if track !== undefined}
            <PlayerControls {player} onPrevious={toPrevious} onNext={toNext} />
          {/if}

          <p class="text-sm text-zinc-500" data-testid="up-next">
            {#if next === undefined}
              Last Piece
            {:else}
              Up next: <b class="text-zinc-900 dark:text-zinc-100">{next.piece.title}</b> · {next
                .heard.text}
            {/if}
          </p>
        </div>

        {#if piece.choirScore !== null}
          <section class="rounded-2xl border bg-white px-2 py-1 dark:bg-zinc-900">
            <ScoreRow
              score={piece.choirScore}
              onOpen={() => {
                viewing = true;
              }}
            />
          </section>
          <ScoreViewer
            open={viewing}
            onClose={() => {
              viewing = false;
            }}
            pieceId={piece.id}
            score={piece.choirScore}
            {player}
            canStart={player.blocked && track !== undefined}
            onStart={() => {
              void playCurrent();
            }}
            closesWhenTrackEnds={false}
          />
        {/if}
      {/if}
    </div>

    <RunningOrder
      {entries}
      currentIndex={at?.index ?? null}
      onJump={(index) => {
        move({ type: 'jump', index });
      }}
    />
  </div>
</div>
