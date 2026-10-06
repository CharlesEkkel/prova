<script lang="ts">
  // PROTOTYPE: three variants of the Home screen, via ?variant=A|B|C
  import { page } from '$app/state';
  import PrototypeSwitcher from '$lib/ui/PrototypeSwitcher.svelte';
  import HomeA from '$lib/variants/HomeA.svelte';
  import HomeB from '$lib/variants/HomeB.svelte';
  import HomeC from '$lib/variants/HomeC.svelte';
  const variants = [
    { key: 'A', name: 'Split dashboard' },
    { key: 'B', name: 'Timeline + tabs' },
    { key: 'C', name: 'Hero + card grid' }
  ];
  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');
</script>

{#if variant === 'A'}<HomeA />{:else if variant === 'B'}<HomeB />{:else}<HomeC />{/if}
<PrototypeSwitcher {variants} />
