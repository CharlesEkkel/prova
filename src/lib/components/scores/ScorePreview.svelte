<script lang="ts">
  // The panel's page preview of the chosen Score, with page arrows. It shares the page with the
  // full-screen viewer, so what the Singer was on is what both show.
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { scorePdfPath } from '../../core/paths';
  import type { PieceId } from '../../core/pieces';
  import { pageAfter, type Score } from '../../core/scores';
  import { pageOfScore, rememberScorePage } from '../../shell/score-pages.svelte';
  import Btn from '../ui/Btn.svelte';
  import PdfPage from './PdfPage.svelte';

  const { pieceId, score }: { readonly pieceId: PieceId; readonly score: Score } = $props();

  let count = $state(0);
  const page = $derived(pageOfScore(score.id));
</script>

<div class="flex flex-col gap-2" data-testid="score-preview">
  <div class="h-72 rounded-xl bg-zinc-100 sm:h-96 dark:bg-zinc-950">
    <PdfPage
      src={scorePdfPath(pieceId, score.id)}
      {page}
      onCount={(found) => {
        count = found;
      }}
    />
  </div>
  <div class="flex items-center justify-center gap-3">
    <Btn
      variant="ghost"
      size="icon"
      aria-label="Previous page"
      disabled={page <= 1}
      onclick={() => {
        rememberScorePage(score.id, pageAfter(page, count, 'back'));
      }}><ChevronLeft class="size-5" /></Btn
    >
    <span class="min-w-24 text-center text-sm text-zinc-500 tabular-nums" data-testid="page-label">
      Page {page}{count > 0 ? ` of ${count.toString()}` : ''}
    </span>
    <Btn
      variant="ghost"
      size="icon"
      aria-label="Next page"
      disabled={count > 0 && page >= count}
      onclick={() => {
        rememberScorePage(score.id, pageAfter(page, count, 'forward'));
      }}><ChevronRight class="size-5" /></Btn
    >
  </div>
</div>
