// The Colour Theme: the palette the whole app is shown in, one for the entire choir. See Colour
// Theme in CONTEXT.md. The palettes themselves are CSS (src/accents.css); this is the list of names
// and what the rest of the app needs to know about each.
export const colourThemes = ['forest', 'violet', 'ocean', 'sunset', 'graphite'] as const;
export type ColourTheme = (typeof colourThemes)[number];

export const defaultColourTheme: ColourTheme = 'forest';

export const colourThemeLabels: Readonly<Record<ColourTheme, string>> = {
  forest: 'Forest',
  violet: 'Violet',
  ocean: 'Ocean',
  sunset: 'Sunset',
  graphite: 'Graphite',
};

/** Whether a stored or submitted value is one of the five themes. */
export const isColourTheme = (value: unknown): value is ColourTheme =>
  colourThemes.some((theme) => theme === value);

/** The theme a value names, or null when it names none. */
export const parseColourTheme = (value: unknown): ColourTheme | null =>
  isColourTheme(value) ? value : null;

/** The colours of a theme in the PWA manifest, so the installed app matches the site. */
export type ThemeColours = {
  readonly theme_color: string;
  readonly background_color: string;
};

/**
 * Each theme's `primary-600` and `primary-50` as hex. colour-theme.test.ts proves they match the
 * CSS in src/accents.css and src/app.css, so changing a palette there fails until this follows.
 */
const manifestColours: Readonly<Record<ColourTheme, ThemeColours>> = {
  forest: { theme_color: '#008236', background_color: '#f0fdf4' },
  violet: { theme_color: '#7008e7', background_color: '#f5f3ff' },
  ocean: { theme_color: '#0069a8', background_color: '#f0f9ff' },
  sunset: { theme_color: '#ca3500', background_color: '#fff7ed' },
  graphite: { theme_color: '#314158', background_color: '#f8fafc' },
};

/** `theme_color` and `background_color` for the web app manifest. */
export const themeColours = (theme: ColourTheme): ThemeColours => manifestColours[theme];
