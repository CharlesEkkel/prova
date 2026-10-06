// PROTOTYPE: light / dark / system theme. The choice is remembered in localStorage; `dark` is the effective
// result. app.html applies the saved choice before first paint; initTheme() takes over once the app is running
// and keeps following the OS setting while the choice is `system`.
export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'prova-theme';

export const theme = $state({ choice: 'system' as ThemeChoice, dark: false });

const isChoice = (v: unknown): v is ThemeChoice => v === 'light' || v === 'dark' || v === 'system';

function apply() {
  const osDark = matchMedia('(prefers-color-scheme: dark)').matches;
  theme.dark = theme.choice === 'dark' || (theme.choice === 'system' && osDark);
  document.documentElement.classList.toggle('dark', theme.dark);
}

export function setTheme(choice: ThemeChoice) {
  theme.choice = choice;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* storage can be blocked (private windows); the choice still applies for this visit */
  }
  apply();
}

/** quick toggle between the two explicit themes, from whatever is showing now */
export const toggleTheme = () => setTheme(theme.dark ? 'light' : 'dark');

/** call once from the root layout (client only); returns a cleanup */
export function initTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (isChoice(saved)) theme.choice = saved;
  } catch {
    /* ignore */
  }
  apply();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', apply);
  return () => mq.removeEventListener('change', apply);
}
