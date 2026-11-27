// Light and dark as the desktop app switches them: data-theme on <html>,
// the choice saved under the app's key, the system appearance until one is
// chosen. index.html applies the start state before the first paint; this
// keeps it current and reveals a switch as a circle from the clicked
// control, unless motion is off.
import { ref } from 'vue';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'lovelycarve-theme';
const root = document.documentElement;
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export const theme = ref<Theme>(root.dataset.theme === 'dark' ? 'dark' : 'light');

function saved(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** The browser's chrome follows the frame colour of the theme. */
function syncThemeColor() {
  const frame = getComputedStyle(root).getPropertyValue('--sidebar-bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', frame);
}

function apply(next: Theme) {
  theme.value = next;
  root.dataset.theme = next;
  syncThemeColor();
}

/** A CSS time token in milliseconds; minified builds may write `.4s`. */
function cssTime(name: string): number {
  const value = getComputedStyle(root).getPropertyValue(name).trim();
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  return value.endsWith('ms') ? amount : amount * 1000;
}

export function setTheme(next: Theme, from?: Element | null) {
  const commit = () => {
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch { /* Storage may be unavailable; the switch still applies. */ }
  };
  if (!from || next === theme.value || root.dataset.motion !== 'full' || typeof document.startViewTransition !== 'function') {
    commit();
    return;
  }
  const rect = from.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document.startViewTransition(commit).ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: cssTime('--motion-slow'),
        easing: getComputedStyle(root).getPropertyValue('--ease-out').trim() || 'ease-out',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  }, () => { /* Skipped (hidden page): the theme is already applied. */ });
}

/** Follow the system appearance until a theme is chosen, and the system motion setting. Returns the disposer. */
export function watchSystem(): () => void {
  const appearance = () => { if (!saved()) apply(darkScheme.matches ? 'dark' : 'light'); };
  const motion = () => { root.dataset.motion = reducedMotion.matches ? 'reduced' : 'full'; };
  darkScheme.addEventListener('change', appearance);
  reducedMotion.addEventListener('change', motion);
  syncThemeColor();
  return () => {
    darkScheme.removeEventListener('change', appearance);
    reducedMotion.removeEventListener('change', motion);
  };
}
