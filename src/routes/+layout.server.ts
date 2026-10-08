import type { LayoutServerLoad } from './$types';

/** The site Colour Theme, so the page can follow it when an Admin changes it without a reload. */
export const load: LayoutServerLoad = ({ locals: { colourTheme } }) => ({ colourTheme });
