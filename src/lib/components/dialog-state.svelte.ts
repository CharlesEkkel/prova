// View model: which dialog is open, if any. `$state` is the one deliberate exception to immutability.

/** The dialog currently shown, or null. Open one by giving it what it is about. */
export const createDialogState = <Dialog>() => {
  let current = $state<Dialog | null>(null);
  return {
    get current() {
      return current;
    },
    open: (next: Dialog) => {
      current = next;
    },
    close: () => {
      current = null;
    },
  };
};
