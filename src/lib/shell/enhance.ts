// Shell: form enhancement shared by the admin dialogs.
import type { SubmitFunction } from '$app/forms';

/** Updates the page, then closes the dialog only if the change went through; a refusal keeps it open. */
export const closeOnSuccess =
  (close: () => void): SubmitFunction =>
  () =>
  async ({ result, update }) => {
    await update();
    if (result.type === 'success') close();
  };
