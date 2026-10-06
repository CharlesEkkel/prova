<script lang="ts">
  // PROTOTYPE: Home = timeline with a hero for the next Performance. Variants are about how much Voice Part
  // info the Piece rows show: A dots, B "what you'd hear", C none. (Major-Performance highlight is a
  // separate, global switcher in the layout.)
  import { page } from '$app/state';
  import PrototypeSwitcher from '$lib/ui/PrototypeSwitcher.svelte';
  import HomeTimeline from '$lib/variants/HomeTimeline.svelte';
  const variants = [
    { key: 'A', name: 'Part dots' },
    { key: 'B', name: 'What you\'d hear' },
    { key: 'C', name: 'No part info' }
  ];
  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');
  const parts = $derived(variant === 'A' ? 'dots' : variant === 'B' ? 'status' : 'none');
</script>

<HomeTimeline {parts} />
<PrototypeSwitcher {variants} />
