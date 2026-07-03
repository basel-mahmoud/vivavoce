'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { site } from '@/lib/site';
import { Logo } from './Logo';

/** Simple in-flow bar on the porcelain canvas. Single line, 64px. */
export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="mx-auto w-full max-w-[1360px] px-4 sm:px-6">
      <div className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="VivaVoce home" className="pressable text-ink">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-ink-mut transition-colors duration-150 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/waitlist"
            className="pressable rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper transition-colors duration-150 hover:bg-[#2E2B27]"
          >
            Get early access
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="pressable grid h-11 w-11 cursor-pointer place-items-center text-ink md:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="tile mb-3 p-5 md:hidden">
          <div className="flex flex-col">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-lg font-bold text-ink"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/waitlist"
              onClick={() => setOpen(false)}
              className="pressable mt-3 rounded-full bg-ink px-5 py-3.5 text-center font-bold text-paper"
            >
              Get early access
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
