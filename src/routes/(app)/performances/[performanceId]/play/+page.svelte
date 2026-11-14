<script lang="ts">
  import PlaybackScope from '../../../../../lib/components/PlaybackScope.svelte';
  import PlaythroughPlayer from '../../../../../lib/components/playthrough/PlaythroughPlayer.svelte';
  import type { PageData } from './$types';

  const { data }: { readonly data: PageData } = $props();
</script>

<svelte:head>
  <title>Play-through of {data.performance.name} · Prova</title>
</svelte:head>

<!-- Keyed by Performance, so moving to another one stops the audio and starts the run afresh. -->
{#key data.performance.id}
  <PlaybackScope>
    {#snippet children(player)}
      <PlaythroughPlayer
        performance={data.performance}
        pieces={data.pieces}
        voiceParts={data.voiceParts}
        voicePartId={data.voicePartId}
        initialOptions={data.options}
        overview={data.overview}
        {player}
      />
    {/snippet}
  </PlaybackScope>
{/key}
