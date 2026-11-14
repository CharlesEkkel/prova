<script lang="ts">
  // The Play-through options during playback: the same two switches as the Overview, in a popover.
  import { Popover } from 'bits-ui';
  import { SlidersHorizontal } from '@lucide/svelte';
  import type { PlaythroughOptions } from '../../core/playthrough';
  import SwitchRow from '../ui/SwitchRow.svelte';

  const {
    options,
    onChange,
  }: {
    readonly options: PlaythroughOptions;
    readonly onChange: (next: PlaythroughOptions) => void;
  } = $props();
</script>

<Popover.Root>
  <Popover.Trigger
    class="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
  >
    <SlidersHorizontal class="size-4" aria-hidden="true" /> Options
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      sideOffset={8}
      align="end"
      class="z-50 w-72 rounded-2xl border bg-white p-3 shadow-xl dark:bg-zinc-900"
    >
      <SwitchRow
        id="run-skip-empty"
        title="Skip Pieces with nothing to play"
        checked={options.skipEmpty}
        onChange={(skipEmpty) => {
          onChange({ ...options, skipEmpty });
        }}
      />
      <SwitchRow
        id="run-prefer-voice-part"
        title="Prefer my Voice Part"
        checked={options.preferVoicePart}
        onChange={(preferVoicePart) => {
          onChange({ ...options, preferVoicePart });
        }}
      />
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
