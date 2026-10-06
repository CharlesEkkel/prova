<script lang="ts">
  // PROTOTYPE: three variants of the Home screen (upcoming Performances + repertoire), via ?variant=A|B|C
  import { page } from '$app/state';
  import PrototypeSwitcher from '$lib/PrototypeSwitcher.svelte';
  import HomeA from '$lib/variants/HomeA.svelte';
  import HomeB from '$lib/variants/HomeB.svelte';
  import HomeC from '$lib/variants/HomeC.svelte';
  const variants = [
    { key: 'A', name: 'Stacked cards' },
    { key: 'B', name: 'Timeline' },
    { key: 'C', name: 'Hero + tabs' }
  ];
  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');
</script>

{#if variant === 'A'}<HomeA />{:else if variant === 'B'}<HomeB />{:else}<HomeC />{/if}
<PrototypeSwitcher {variants} />
