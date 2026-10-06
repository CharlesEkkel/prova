<script lang="ts">
  // PROTOTYPE: three variants of the Performance play-through screen, via ?variant=A|B|C
  // /perform/w1 has an empty Piece (Sicut Cervus) to exercise the pause state and "skip empty".
  import { onDestroy } from 'svelte';
  import { page } from '$app/state';
  import { performance as findPerf } from '$lib/data';
  import PrototypeSwitcher from '$lib/PrototypeSwitcher.svelte';
  import { endPlaythrough, session, startPlaythrough } from '$lib/player.svelte';
  import PerformA from '$lib/variants/PerformA.svelte';
  import PerformB from '$lib/variants/PerformB.svelte';
  import PerformC from '$lib/variants/PerformC.svelte';
  const variants = [
    { key: 'A', name: 'Now playing' },
    { key: 'B', name: 'Setlist' },
    { key: 'C', name: 'Score-first' }
  ];
  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');
  const perf = $derived(findPerf(page.params.id));
  // (re)start whenever the Performance changes; the variant switch must not restart it
  $effect(() => {
    if (session.perfId !== perf.id) startPlaythrough(perf.id);
  });
  onDestroy(endPlaythrough);
</script>

{#if variant === 'A'}<PerformA {perf} />{:else if variant === 'B'}<PerformB {perf} />{:else}<PerformC {perf} />{/if}
<PrototypeSwitcher {variants} />
