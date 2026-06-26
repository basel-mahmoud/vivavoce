'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { site } from '@/lib/site';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="VivaVoce home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-ink hover:bg-surface-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <ButtonLink href="/waitlist" size="sm">
            Get early access
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-line bg-bg md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base text-ink hover:bg-surface-2"
              >
                {item.label}
              </Link>
            ))}
            <ButtonLink href="/waitlist" className="mt-2" onClick={() => setOpen(false)}>
              Get early access
            </ButtonLink>
          </Container>
        </div>
      )}
    </header>
  );
}
