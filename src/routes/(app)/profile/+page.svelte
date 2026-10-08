<script lang="ts">
  import AlertMessage from '../../../lib/components/AlertMessage.svelte';
  import PrimaryButton from '../../../lib/components/PrimaryButton.svelte';
  import VoicePartPicker from '../../../lib/components/VoicePartPicker.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
</script>

<div class="mx-auto w-full max-w-md px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Change default Voice Part</h1>
  <p class="mt-1 text-zinc-500">
    We show your part's practice tracks first. Pick a different part for one Piece from its player.
  </p>

  <form method="POST" class="mt-6 flex flex-col gap-4">
    <VoicePartPicker voiceParts={data.voiceParts} selected={data.currentVoicePartId} />

    {#if form?.problem}
      <AlertMessage>{form.problem}</AlertMessage>
    {/if}

    <PrimaryButton>Save</PrimaryButton>
  </form>
</div>
