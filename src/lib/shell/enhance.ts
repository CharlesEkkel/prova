// Shell: form enhancement shared by the dialogs.
import type { SubmitFunction } from '$app/forms';
import { refreshAll } from '$app/navigation';
import { Schema } from 'effect';
import { isPerformanceId, performanceMessages, type PerformanceId } from '../core/performances';

/** Updates the page, then closes the dialog only if the change went through; a refusal keeps it open. */
export const closeOnSuccess =
  (close: () => void): SubmitFunction =>
  () =>
  async ({ result, update }) => {
    await update();
    if (result.type === 'success') close();
  };

const Refused = Schema.Struct({ problem: Schema.String });
const isRefused = Schema.is(Refused);
const Created = Schema.Struct({ id: Schema.declare(isPerformanceId) });
const isCreated = Schema.is(Created);

/** How a Performance form came back: done (with the new Performance's id, when it made one), or the message to show. */
export type PerformanceFormOutcome =
  | { readonly ok: true; readonly created: PerformanceId | null }
  | { readonly ok: false; readonly problem: string };

/**
 * For the Performance forms, whose actions live on their own route and are posted from any page.
 * The page's data is refreshed either way, so a refusal (a stale order, say) shows what is there now;
 * the outcome goes to `onDone`, since SvelteKit only shows an action's answer on the page holding it.
 */
export const submitPerformanceForm =
  (onDone: (outcome: PerformanceFormOutcome) => void | Promise<void>): SubmitFunction =>
  () =>
  async ({ result }) => {
    await refreshAll();
    await onDone(
      result.type === 'success'
        ? { ok: true, created: isCreated(result.data) ? result.data.id : null }
        : {
            ok: false,
            problem:
              result.type === 'failure' && isRefused(result.data)
                ? result.data.problem
                : performanceMessages.failed,
          },
    );
  };
