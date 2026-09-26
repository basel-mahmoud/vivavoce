'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { site } from '@/lib/site';
import { EASE, SPRING, exitDuration, staggerDelay } from '@/lib/motion';
import { InkStroke } from './InkStroke';
import { isCurrent } from './paths';
import { Logo } from './Logo';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SHEET_S = 0.5;

/**
 * A floating capsule with a hairline edge that turns into a solid card once
 * the page moves under it. One hover pill slides between the links (fine
 * pointers). Below 768px the links live in a sheet of ruled paper that drops
 * from behind the capsule on the drawer curve: focus is held inside it,
 * Escape or the scrim closes it, and the page behind is inert.
 */
export function Nav() {
  const pathname = usePathname();
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const next = y > 16;
    setScrolled((prev) => (prev === next ? prev : next));
  });

  // Close on route change (render-phase reset, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) toggle.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const behind = Array.from(document.querySelectorAll<HTMLElement>('body > main, body > footer'));
    behind.forEach((el) => el.setAttribute('inert', ''));
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    sheet.current?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== 'Tab' || !sheet.current || !toggle.current) return;
      // The toggle (now "Close menu") and the sheet form one loop.
      const loop = [toggle.current, ...Array.from(sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE))];
      const at = loop.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (at <= 0 ? loop.length - 1 : at - 1) : at < 0 || at === loop.length - 1 ? 0 : at + 1;
      e.preventDefault();
      loop[next]?.focus();
    };
    const wide = window.matchMedia('(min-width: 768px)');
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      behind.forEach((el) => el.removeAttribute('inert'));
      root.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open, close]);

  const solid = scrolled || open;

  return (
    <header className="vv-nav" data-solid={solid ? '' : undefined} data-open={open ? '' : undefined}>
      <div className="vv-nav-capsule">
        <Link href="/" aria-label="VivaVoce home" className="vv-nav-logo pressable">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="vv-nav-links" onPointerLeave={() => setHovered(null)}>
          {site.nav.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? 'page' : undefined}
                data-app={item.href === '/dashboard' ? '' : undefined}
                className="vv-nav-link"
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setHovered(item.href);
                }}
                onFocus={(e) => {
                  if (e.currentTarget.matches(':focus-visible')) setHovered(item.href);
                }}
                onBlur={() => setHovered(null)}
              >
                {hovered === item.href && (
                  <motion.span
                    layoutId="vv-nav-pill"
                    aria-hidden
                    className="vv-nav-pill"
                    transition={reduce ? { duration: 0 } : SPRING.ui}
                  />
                )}
                <span className="relative">{item.label}</span>
                {current ? <InkStroke key={pathname} /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="vv-nav-end">
          <Link href="/waitlist" className="btn btn-primary btn-sm vv-nav-cta">
            Get early access
          </Link>
          <button
            ref={toggle}
            type="button"
            className="vv-nav-toggle pressable"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="vv-site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            className="vv-sheet-scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
            onClick={() => close(true)}
          />
        )}
        {open && (
          <motion.div
            key="sheet"
            ref={sheet}
            id="vv-site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="vv-sheet"
            initial={reduce ? { opacity: 0 } : { transform: 'translateY(-100%)' }}
            animate={
              reduce
                ? { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }
                : { transform: 'translateY(0%)', transition: { duration: SHEET_S, ease: EASE.drawer } }
            }
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }
                : { transform: 'translateY(-100%)', transition: { duration: exitDuration(SHEET_S), ease: EASE.drawer } }
            }
          >
            <nav aria-label="Menu" className="vv-sheet-links">
              {site.nav.map((item, i) => {
                const current = isCurrent(pathname, item.href);
                return (
                  <motion.div
                    key={item.href}
                    initial={reduce ? false : { opacity: 0, transform: 'translateY(10px)' }}
                    animate={{
                      opacity: 1,
                      transform: 'translateY(0px)',
                      transition: { duration: 0.34, delay: 0.12 + staggerDelay(i, 0.04), ease: EASE.out },
                    }}
                  >
                    <Link
                      href={item.href}
                      aria-current={current ? 'page' : undefined}
                      className="vv-sheet-link"
                      onClick={() => setOpen(false)}
                    >
                      <span className="relative">
                        {item.label}
                        {current ? <InkStroke /> : null}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
            <Link href="/waitlist" className="btn btn-primary btn-lg vv-sheet-cta" onClick={() => setOpen(false)}>
              Get early access
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
