// PROTOTYPE: appearance. Two independent choices, both remembered in localStorage:
//  - mode: light / dark / system (system follows the OS live); `dark` is the effective result
//  - accent: the colour theme (see src/accents.css; `violet` is the default and has no override)
// app.html applies both before first paint; initTheme() takes over once the app is running.
export type ThemeChoice = 'light' | 'dark' | 'system';
export type Accent = 'violet' | 'ocean' | 'forest' | 'sunset' | 'graphite';
const MODE_KEY = 'prova-theme';
const ACCENT_KEY = 'prova-accent';

/** from / to = the gradient shown in the picker swatch (and used by that theme's hero). Violet uses fixed values
 *  because the `violet-*` variables are the ones the other themes re-point. */
export const ACCENTS: { id: Accent; label: string; from: string; to: string }[] = [
  { id: 'violet', label: 'Violet', from: 'oklch(54.1% 0.281 293.009)', to: 'oklch(45.7% 0.24 277.023)' },
  { id: 'ocean', label: 'Ocean', from: 'var(--color-blue-600)', to: 'var(--color-cyan-700)' },
  { id: 'forest', label: 'Forest', from: 'var(--color-green-700)', to: 'var(--color-teal-700)' },
  { id: 'sunset', label: 'Sunset', from: 'var(--color-pink-600)', to: 'var(--color-orange-700)' },
  { id: 'graphite', label: 'Graphite', from: 'var(--color-slate-700)', to: 'var(--color-zinc-800)' }
];

export const theme = $state({ choice: 'system' as ThemeChoice, dark: false, accent: 'violet' as Accent });

const isChoice = (v: unknown): v is ThemeChoice => v === 'light' || v === 'dark' || v === 'system';
const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.id === v);

function apply() {
  const osDark = matchMedia('(prefers-color-scheme: dark)').matches;
  theme.dark = theme.choice === 'dark' || (theme.choice === 'system' && osDark);
  const root = document.documentElement;
  root.classList.toggle('dark', theme.dark);
  root.dataset.accent = theme.accent;
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
export function setAccent(accent: Accent) {
  theme.accent = accent;
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
    if (isAccent(accent)) theme.accent = accent;
  } catch {
    /* ignore */
  }
  apply();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', apply);
  return () => mq.removeEventListener('change', apply);
}
