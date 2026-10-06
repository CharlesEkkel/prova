// PROTOTYPE: appearance, as two separate things:
//  - mode (light / dark / system): personal. Each Singer picks their own; `system` follows the OS live.
//  - accent (the colour theme, see src/accents.css): a SITE setting an Admin chooses once, for everyone.
// app.html applies both before first paint; initTheme() takes over once the app is running.
//
// The prototype has no server, so the site accent is kept in localStorage under `prova-site-accent` as a stand-in
// for a setting stored by the backend. In the real app every Singer would read the same stored value.
import { can } from './access.svelte';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type Accent = 'violet' | 'ocean' | 'forest' | 'sunset' | 'graphite';
const MODE_KEY = 'prova-theme';
const ACCENT_KEY = 'prova-site-accent';
export const DEFAULT_ACCENT: Accent = 'forest';

/** from / to = the gradient shown in the swatch (and used by that theme's hero). Violet uses fixed values
 *  because the `violet-*` variables are the ones the other themes re-point. */
export const ACCENTS: { id: Accent; label: string; blurb: string; from: string; to: string }[] = [
  { id: 'forest', label: 'Forest', blurb: 'Fresh green', from: 'var(--color-green-700)', to: 'var(--color-teal-700)' },
  { id: 'violet', label: 'Violet', blurb: 'Playful purple', from: 'oklch(54.1% 0.281 293.009)', to: 'oklch(45.7% 0.24 277.023)' },
  { id: 'ocean', label: 'Ocean', blurb: 'Calm blue', from: 'var(--color-blue-600)', to: 'var(--color-cyan-700)' },
  { id: 'sunset', label: 'Sunset', blurb: 'Warm pink and orange', from: 'var(--color-pink-600)', to: 'var(--color-orange-700)' },
  { id: 'graphite', label: 'Graphite', blurb: 'Quiet slate', from: 'var(--color-slate-700)', to: 'var(--color-zinc-800)' }
];

export const theme = $state({ choice: 'system' as ThemeChoice, dark: false }); // personal
export const site = $state({ accent: DEFAULT_ACCENT as Accent }); // for everyone

const isChoice = (v: unknown): v is ThemeChoice => v === 'light' || v === 'dark' || v === 'system';
const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.id === v);

function apply() {
  const osDark = matchMedia('(prefers-color-scheme: dark)').matches;
  theme.dark = theme.choice === 'dark' || (theme.choice === 'system' && osDark);
  const root = document.documentElement;
  root.classList.toggle('dark', theme.dark);
  root.dataset.accent = site.accent;
}
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be blocked (private windows); the choice still applies for this visit */
  }
};

export function setTheme(choice: ThemeChoice) {
  theme.choice = choice;
  save(MODE_KEY, choice);
  apply();
}

/** Change the site-wide colour theme. Only Singers with `manage-users` may; a real backend would enforce this too. */
export function setSiteAccent(accent: Accent) {
  if (!can('manage-users')) return;
  site.accent = accent;
  save(ACCENT_KEY, accent);
  apply();
}

/** quick toggle between the two explicit modes, from whatever is showing now */
export const toggleTheme = () => setTheme(theme.dark ? 'light' : 'dark');

/** call once from the root layout (client only); returns a cleanup */
export function initTheme() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    if (isChoice(mode)) theme.choice = mode;
    const accent = localStorage.getItem(ACCENT_KEY);
    if (isAccent(accent)) site.accent = accent;
  } catch {
    /* ignore */
  }
  apply();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', apply);
  return () => mq.removeEventListener('change', apply);
}
