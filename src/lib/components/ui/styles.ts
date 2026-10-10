// Shared form styling. Bits UI has no text input, so inputs are native and styled here.
export const input =
  'h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-zinc-700 dark:bg-zinc-950';
/** A native file picker: the Browse button is styled and carries the focus ring, not the whole field. */
export const fileInput =
  'block w-full text-sm focus-visible:outline-none file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-primary-100 file:px-4 file:font-medium file:text-primary-700 focus-visible:file:outline-2 focus-visible:file:outline-offset-2 focus-visible:file:outline-primary-500 dark:file:bg-primary-500/15 dark:file:text-primary-300';
export const fieldLabel = 'mb-1.5 block text-sm font-medium';
export const hint = 'mt-1 text-xs text-zinc-500';
export const errorText = 'mt-1.5 text-sm text-red-600 dark:text-red-400';

/** A raised surface: a list item, a panel. */
export const card = 'rounded-2xl border bg-white dark:bg-zinc-900';
/** The floating panel of a menu. */
export const menuPanel = 'rounded-xl border bg-white p-1 shadow-xl dark:bg-zinc-900';
/** One entry of a menu. */
export const menuEntry =
  'flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm outline-none data-disabled:opacity-40 data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800';
