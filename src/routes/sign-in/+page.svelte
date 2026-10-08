<script lang="ts">
  import AlertMessage from '../../lib/components/AlertMessage.svelte';
  import GateScreen from '../../lib/components/GateScreen.svelte';
  import PrimaryButton from '../../lib/components/PrimaryButton.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
  const problem = $derived(form?.problem ?? data.problem);
</script>

<GateScreen title="Sign in">
  <p class="opacity-80">
    Practice audio and scores for your choir. Sign in with Google to continue.
  </p>

  {#if problem !== null}
    <AlertMessage>{problem}</AlertMessage>
  {/if}

  <form method="POST" action={data.googleAction}>
    <PrimaryButton>{problem === null ? 'Continue with Google' : 'Try again'}</PrimaryButton>
  </form>
</GateScreen>
