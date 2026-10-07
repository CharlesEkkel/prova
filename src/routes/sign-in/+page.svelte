<script lang="ts">
  import GateScreen from '../../lib/components/GateScreen.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form }: { readonly data: PageData; readonly form: ActionData } = $props();
  const problem = $derived(form?.problem ?? data.problem);
</script>

<GateScreen title="Sign in">
  <p class="opacity-80">
    Practice audio and scores for your choir. Sign in with Google to continue.
  </p>

  {#if problem !== null}
    <p
      role="alert"
      class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    >
      {problem}
    </p>
  {/if}

  <form method="POST" action="?/google&next={encodeURIComponent(data.next)}">
    <button
      class="min-h-11 w-full rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
    >
      {problem === null ? 'Continue with Google' : 'Try again'}
    </button>
  </form>
</GateScreen>
