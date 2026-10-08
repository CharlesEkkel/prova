<script lang="ts">
  import { RadioGroup } from 'bits-ui';
  import AlertMessage from '../../lib/components/AlertMessage.svelte';
  import GateScreen from '../../lib/components/GateScreen.svelte';
  import PrimaryButton from '../../lib/components/PrimaryButton.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
</script>

<GateScreen title="Which part do you sing?">
  <p class="opacity-80">We show your part's practice tracks first. You can change this later.</p>

  <form method="POST" class="flex flex-col gap-4">
    <RadioGroup.Root name="voice_part" class="flex flex-col gap-2" aria-label="Voice Part">
      {#each data.voiceParts as part (part.id)}
        <RadioGroup.Item
          value={part.id}
          class="flex min-h-11 items-center gap-3 rounded border px-3 py-2 text-left data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-50 dark:data-[state=checked]:bg-primary-950"
        >
          <span class="w-6 font-semibold">{part.shortLabel}</span>
          <span>{part.name}</span>
        </RadioGroup.Item>
      {/each}
    </RadioGroup.Root>

    {#if form?.problem}
      <AlertMessage>{form.problem}</AlertMessage>
    {/if}

    <PrimaryButton>Continue</PrimaryButton>
  </form>
</GateScreen>
