<script lang="ts">
  import AlertMessage from '../../lib/components/AlertMessage.svelte';
  import GateScreen from '../../lib/components/GateScreen.svelte';
  import PrimaryButton from '../../lib/components/PrimaryButton.svelte';
  import VoicePartPicker from '../../lib/components/VoicePartPicker.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
</script>

<GateScreen title="Which part do you sing?">
  <p class="opacity-80">We show your part's practice tracks first. You can change this later.</p>

  <form method="POST" class="flex flex-col gap-4">
    <VoicePartPicker voiceParts={data.voiceParts} />

    {#if form?.problem}
      <AlertMessage>{form.problem}</AlertMessage>
    {/if}

    <PrimaryButton>Continue</PrimaryButton>
  </form>
</GateScreen>
