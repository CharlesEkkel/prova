// PROTOTYPE: tiny shared UI state (search dialog, mobile menu drawer, which Performance overview is open)
export const ui = $state({ search: false, menu: false, overview: null as string | null });

/** open a Performance's overview from anywhere (closes the menu drawer and search first) */
export function openOverview(perfId: string) {
  ui.menu = false;
  ui.search = false;
  ui.overview = perfId;
}
