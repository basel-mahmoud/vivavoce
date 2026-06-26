'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const EVENT = 'vv-theme-change';

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}
function getServerSnapshot() {
  return true; // matches the default-dark no-flash script during SSR
}

export function ThemeToggle() {
  // Reads the live <html> class without setState-in-effect; toggling dispatches
  // an event so every mounted toggle re-renders in sync.
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('vv-theme', next ? 'dark' : 'light');
    } catch {
      /* storage may be unavailable */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition-colors hover:text-ink hover:bg-surface-2"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
