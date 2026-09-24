'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { site } from '@/lib/site';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * A floating pill over the room. Transparent while you are at the top of the
 * page, a solid card once you scroll. A single hover pill slides between links.
 */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const next = y > 24;
    setScrolled((prev) => (prev === next ? prev : next));
  });

  // Close on route change (render-phase reset, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <div
        className={cn(
          'pointer-events-auto mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between rounded-full border pl-4 pr-2 transition-[background-color,border-color,box-shadow] duration-200 ease-out sm:pl-5',
          solid
            ? 'border-line bg-card shadow-[0_12px_32px_-20px_rgb(var(--vv-shadow)/0.45)]'
            : 'border-transparent bg-transparent',
        )}
      >
        <Link href="/" aria-label="VivaVoce home" className="pressable text-ink">
          <Logo />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {site.nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => setHovered(item.href)}
                onFocus={() => setHovered(item.href)}
                className={cn(
                  'relative rounded-full px-3.5 py-2 text-sm font-bold transition-colors duration-150',
                  active ? 'text-ink' : 'text-ink-mut hover:text-ink',
                )}
              >
                {hovered === item.href && (
                  <motion.span
                    layoutId="nav-hover"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full bg-card-2"
                    transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                  />
                )}
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-verm"
                  />
                )}
              </Link>
            );
          })}
          <Link href="/waitlist" className="btn btn-verm ml-3 h-10 px-5 text-sm">
            Get early access
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <Link href="/waitlist" className="btn btn-verm h-9 px-3.5 text-[0.82rem] max-[359px]:hidden">
            Get early access
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="pressable grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, transform: 'translateY(-8px) scale(0.98)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            exit={{ opacity: 0, transform: 'translateY(-6px) scale(0.98)', transition: { duration: 0.14 } }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            style={{ transformOrigin: 'top right' }}
            className="tile pointer-events-auto mx-auto mt-2 max-w-[1360px] p-3 shadow-[0_24px_48px_-24px_rgb(var(--vv-shadow)/0.5)] md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {site.nav.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, transform: 'translateY(6px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px)' }}
                  transition={{ duration: 0.24, delay: 0.03 + i * 0.035, ease: EASE_OUT }}
                >
                  <Link
                    ref={i === 0 ? firstLink : undefined}
                    href={item.href}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className="display flex items-center justify-between rounded-2xl px-4 py-3.5 text-[1.6rem] text-ink transition-colors duration-150 active:bg-card-2 aria-[current=page]:text-verm"
                  >
                    {item.label}
                    <ArrowRight size={20} aria-hidden className="text-ink-faint" />
                  </Link>
                </motion.div>
              ))}
              <Link
                href="/waitlist"
                onClick={() => setOpen(false)}
                className="btn btn-verm mt-2 h-13 w-full text-base"
              >
                Get early access
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
