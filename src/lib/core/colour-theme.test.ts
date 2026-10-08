import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  colourThemeOrDefault,
  colourThemes,
  defaultColourTheme,
  isColourTheme,
  parseColourTheme,
  themeColours,
  type ColourTheme,
} from './colour-theme';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const appCss = read('../../app.css');
const accentsCss = read('../../accents.css');
const tailwindTheme = read('../../../node_modules/tailwindcss/theme.css');

/** What `--color-primary-<step>` points at for a theme, e.g. `green-700`. Forest is the @theme default. */
const paletteStep = (theme: ColourTheme, step: number): string => {
  const source = theme === 'forest' ? appCss : accentsCss.split(`data-accent='${theme}'`)[1];
  const match = new RegExp(`--color-primary-${String(step)}: var\\(--color-([a-z]+-\\d+)\\)`).exec(
    source ?? '',
  );
  if (match?.[1] === undefined) throw new Error(`no primary-${String(step)} for ${theme}`);
  return match[1];
};

type Rgb = readonly [number, number, number];

/** A Tailwind palette entry (oklch) as sRGB, 0 to 1 per channel. */
const srgbOf = (entry: string): Rgb => {
  const match = new RegExp(`--color-${entry}: oklch\\(([\\d.]+)% ([\\d.]+) ([\\d.]+)\\)`).exec(
    tailwindTheme,
  );
  if (match === null) throw new Error(`${entry} is not in Tailwind's theme`);
  const [lightness, chroma, hue] = [Number(match[1]) / 100, Number(match[2]), Number(match[3])];
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (channel: number): number => Math.min(1, Math.max(0, channel));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const encode = (linear: number): number =>
  linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;

const hexOf = (entry: string): string =>
  `#${srgbOf(entry)
    .map((channel) =>
      Math.round(encode(channel) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** WCAG relative luminance of a colour given as linear sRGB. */
const luminance = ([r, g, b]: Rgb): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const contrastWithWhite = (entry: string): number => 1.05 / (luminance(srgbOf(entry)) + 0.05);

describe('colourThemes', () => {
  it('are the five themes, Forest first and the default', () => {
    expect(colourThemes).toEqual(['forest', 'violet', 'ocean', 'sunset', 'graphite']);
    expect(defaultColourTheme).toBe('forest');
  });

  it('recognises only those five names', () => {
    expect(colourThemes.every(isColourTheme)).toBe(true);
    expect(['Forest', 'neon', '', undefined, null, 3].map(isColourTheme)).toEqual(
      Array.from({ length: 6 }, () => false),
    );
  });

  it('parses a name to a theme or null, and falls back to Forest', () => {
    expect(parseColourTheme('ocean')).toBe('ocean');
    expect(parseColourTheme('neon')).toBeNull();
    expect(colourThemeOrDefault('sunset')).toBe('sunset');
    expect(colourThemeOrDefault('neon')).toBe('forest');
    expect(colourThemeOrDefault(undefined)).toBe('forest');
  });
});

describe('the palettes', () => {
  it.each(colourThemes)('%s: white on primary-600 is at least 4.5:1', (theme) => {
    expect(contrastWithWhite(paletteStep(theme, 600))).toBeGreaterThanOrEqual(4.5);
  });

  it('re-point every primary step for each theme but Forest, which is the @theme default', () => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    colourThemes
      .filter((theme) => theme !== defaultColourTheme)
      .forEach((theme) => {
        expect(() => steps.map((step) => paletteStep(theme, step))).not.toThrow();
      });
  });
});

describe('themeColours', () => {
  it.each(colourThemes)(
    '%s: the manifest colours are the theme’s primary-600 and primary-50',
    (theme) => {
      expect(themeColours(theme)).toEqual({
        theme_color: hexOf(paletteStep(theme, 600)),
        background_color: hexOf(paletteStep(theme, 50)),
      });
    },
  );
});
