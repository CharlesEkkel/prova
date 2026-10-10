<script lang="ts">
  // Says which track would play (`All`, `Alto only`, `Alto + mix`). Opening it lists All and the
  // Voice Parts that have a track on this Piece; choosing one plays it once and saves nothing.
  import { Popover, ToggleGroup } from 'bits-ui';
  import { ChevronDown } from '@lucide/svelte';
  import type { PartChoice } from '../../core/playthrough';
  import { combinedTrackLabel } from '../../core/voice-parts';
  import type { VoicePart } from '../../shell/voice-parts';

  const {
    text,
    voiceParts,
    hasCombined,
    voicePartIds,
    selected,
    onChoose,
  }: {
    /** What is playing, as the indicator says it. */
    readonly text: string;
    readonly voiceParts: readonly VoicePart[];
    readonly hasCombined: boolean;
    /** The Voice Parts that have a track on this Piece. */
    readonly voicePartIds: ReadonlySet<string>;
    /** 'all', a Voice Part's id, or '' when nothing is selected. */
    readonly selected: string;
    readonly onChoose: (choice: PartChoice) => void;
  } = $props();

  const combinedKey = 'all';
  const choose = (key: string): void => {
    if (key === '' || key === selected) return;
    onChoose(key === combinedKey ? { type: 'combined' } : { type: 'part', voicePartId: key });
  };
  const item =
    'grid h-11 min-w-11 flex-1 place-items-center rounded-xl px-2 text-base font-bold text-zinc-600 disabled:opacity-35 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:text-zinc-400 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900';
</script>

<Popover.Root>
  <Popover.Trigger
    data-testid="part-indicator"
    aria-label="Playing {text}. Change what plays"
    class="group inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-300 px-3 text-sm font-semibold transition hover:border-primary-500 dark:border-zinc-700"
  >
    {text}
    <ChevronDown
      class="size-4 text-zinc-400 transition group-hover:text-primary-600 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      align="start"
      sideOffset={8}
      class="z-50 w-80 max-w-[92vw] rounded-2xl border bg-white p-4 shadow-xl dark:bg-zinc-900"
    >
      <h3 class="mb-2 text-sm font-semibold">What plays on this Piece</h3>
      <ToggleGroup.Root
        type="single"
        value={selected}
        onValueChange={choose}
        aria-label="Track"
        class="flex flex-wrap gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800"
      >
        {#each voiceParts as part (part.id)}
          <ToggleGroup.Item
            value={part.id}
            aria-label={part.name}
            disabled={!voicePartIds.has(part.id)}
            class={item}>{part.shortLabel}</ToggleGroup.Item
          >
        {/each}
        <ToggleGroup.Item
          value={combinedKey}
          aria-label="All parts (the Combined Track)"
          disabled={!hasCombined}
          class="{item} flex-[1.4]!">{combinedTrackLabel}</ToggleGroup.Item
        >
      </ToggleGroup.Root>
      <p class="mt-2 text-xs text-zinc-500">
        This only changes what plays now. Parts without a track on this Piece are dimmed.
      </p>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
