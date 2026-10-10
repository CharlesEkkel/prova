// Shell: form enhancement shared by the dialogs.
import type { SubmitFunction } from '$app/forms';
import { refreshAll } from '$app/navigation';
import { Schema } from 'effect';

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

/** What a form posted to another page's action came back with: its data, or the message to show. */
export type ElsewhereOutcome =
  { readonly ok: true; readonly data: unknown } | { readonly ok: false; readonly problem: string };

/**
 * For a form whose action lives on another page (the Performance actions, posted from anywhere). The
 * page's data is refreshed after a success; the outcome goes to `onDone`, since SvelteKit only shows
 * an action's answer on the page that holds it.
 */
export const submitElsewhere =
  (onDone: (outcome: ElsewhereOutcome) => void | Promise<void>): SubmitFunction =>
  () =>
  async ({ result }) => {
    if (result.type === 'success') {
      await refreshAll();
      await onDone({ ok: true, data: result.data });
    } else {
      await onDone({
        ok: false,
        problem:
          result.type === 'failure' && isRefused(result.data)
            ? result.data.problem
            : 'That did not work. Try again in a moment.',
      });
    }
  };
