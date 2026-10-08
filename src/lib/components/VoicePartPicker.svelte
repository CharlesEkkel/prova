<script lang="ts">
  // The choir's Voice Parts as a radio list, from the configured list rather than a fixed four. Used
  // wherever a Singer picks their default, so every picker offers the same parts in the same order.
  import { RadioGroup } from 'bits-ui';
  import type { VoicePart } from '../shell/voice-parts';

  const {
    voiceParts,
    selected = '',
  }: {
    readonly voiceParts: readonly VoicePart[];
    /** The id of the Voice Part to start on, if the Singer already has one. */
    readonly selected?: string;
  } = $props();
</script>

<RadioGroup.Root
  name="voice_part"
  value={selected}
  class="flex flex-col gap-2"
  aria-label="Voice Part"
>
  {#each voiceParts as part (part.id)}
    <RadioGroup.Item
      value={part.id}
      class="flex min-h-11 items-center gap-3 rounded border px-3 py-2 text-left data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-50 dark:data-[state=checked]:bg-primary-950"
    >
      <span class="w-8 font-semibold">{part.shortLabel}</span>
      <span>{part.name}</span>
    </RadioGroup.Item>
  {/each}
</RadioGroup.Root>
