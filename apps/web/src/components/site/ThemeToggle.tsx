'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('vv-theme', next ? 'dark' : 'light');
    } catch {
      /* storage may be unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition-colors hover:text-ink hover:bg-surface-2"
    >
      {mounted && dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
