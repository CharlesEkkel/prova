<script lang="ts">
  import { onMount } from 'svelte';
  import { refreshAll } from '$app/navigation';
  import GateScreen from '../../lib/components/GateScreen.svelte';
  import PrimaryButton from '../../lib/components/PrimaryButton.svelte';
  import { paths } from '../../lib/core/paths';
  import type { PageData } from './$types';

  const { data }: { readonly data: PageData } = $props();

  let checking = $state(false);

  // Re-running the loads makes the gate look again: once an Admin has approved this Singer it sends
  // them to the app instead of rendering this screen.
  const checkAgain = async () => {
    if (checking) return;
    checking = true;
    await refreshAll();
    checking = false;
  };

  // Coming back to the tab or to the window both count; the two often fire together, and
  // `checkAgain` ignores the second while the first is still running.
  onMount(() => {
    const recheckWhenVisible = () => {
      if (document.visibilityState === 'visible') void checkAgain();
    };
    const recheckOnFocus = () => void checkAgain();
    document.addEventListener('visibilitychange', recheckWhenVisible);
    window.addEventListener('focus', recheckOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', recheckWhenVisible);
      window.removeEventListener('focus', recheckOnFocus);
    };
  });
</script>

<GateScreen title="Waiting for approval">
  <p>
    An Admin needs to approve you before you can use Prova. Please contact an Admin of your choir
    and ask them to approve you.
  </p>

  <dl class="rounded border p-3 text-sm">
    <div class="flex justify-between gap-4">
      <dt class="opacity-70">Signed in as</dt>
      <dd class="text-right">
        {data.displayName}<br /><span class="opacity-70">{data.email}</span>
      </dd>
    </div>
    <div class="mt-2 flex justify-between gap-4">
      <dt class="opacity-70">Your part</dt>
      <dd>{data.voicePartName}</dd>
    </div>
  </dl>

  <PrimaryButton disabled={checking} onclick={checkAgain}>Check again</PrimaryButton>

  <form method="POST" action={paths.signOut}>
    <button class="min-h-11 w-full rounded border px-4 py-2 font-medium">Sign out</button>
  </form>
</GateScreen>
