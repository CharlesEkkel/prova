import { fail, redirect } from '@sveltejs/kit';
import { Effect } from 'effect';
import { performanceMessages } from '../../../lib/core/performances';
import { formActions, paths } from '../../../lib/core/paths';
import {
  addPieceToPerformances,
  createPerformance,
  deletePerformance,
  performanceForm,
  removePieceFromPerformance,
  reorderPerformance,
  updatePerformance,
} from '../../../lib/shell/performances';
import type { Actions, PageServerLoad } from './$types';

// There is no Performance page: this route only holds the actions the shell's dialogs post to from
// whatever page the Singer is on. A Performance opens as an Overview on top of that page.
export const load: PageServerLoad = () => redirect(303, paths.home);

export const actions: Actions = {
  // Answers with the new Performance's id, so the dialog can open its Overview.
  [formActions.performances.create]: ({ locals, request }) =>
    Effect.runPromise(
      createPerformance(locals.supabase, request).pipe(
        Effect.match({
          onFailure: (problem) => fail(400, { problem: performanceMessages[problem] }),
          onSuccess: (id) => ({ id }),
        }),
      ),
    ),
  [formActions.performances.update]: ({ locals, request }) =>
    performanceForm.command(updatePerformance, locals.supabase, request),
  [formActions.performances.delete]: ({ locals, request }) =>
    performanceForm.command(deletePerformance, locals.supabase, request),
  [formActions.performances.addPiece]: ({ locals, request }) =>
    performanceForm.command(addPieceToPerformances, locals.supabase, request),
  [formActions.performances.removePiece]: ({ locals, request }) =>
    performanceForm.command(removePieceFromPerformance, locals.supabase, request),
  [formActions.performances.reorder]: ({ locals, request }) =>
    performanceForm.command(reorderPerformance, locals.supabase, request),
};
