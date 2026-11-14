<script lang="ts">
  // What a Singer would hear on a Piece, with a dot: green when something plays, amber when nothing
  // would. Home's tiles and the Performance Overview show it the same way.
  const {
    text,
    playable,
    hero = false,
  }: {
    readonly text: string;
    readonly playable: boolean;
    /** On the next Performance's coloured Home tile, which needs lighter text. */
    readonly hero?: boolean;
  } = $props();

  const tone = $derived(
    playable
      ? hero
        ? 'text-primary-100'
        : 'text-zinc-500'
      : hero
        ? 'text-amber-200'
        : 'text-amber-700 dark:text-amber-400',
  );
</script>

<span class="inline-flex items-center gap-1.5 text-xs whitespace-nowrap {tone}">
  <span
    class="size-1.5 rounded-full {playable ? 'bg-emerald-500' : 'bg-amber-500'}"
    aria-hidden="true"
  ></span>
  {text}
</span>
