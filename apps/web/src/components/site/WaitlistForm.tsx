'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Early-access capture. `tone` says which surface it sits on so the label and
 * messages keep their contrast: vermilion field or a card.
 * Field names/ids are stable (analytics + backend).
 */
export function WaitlistForm({ tone = 'verm' }: { tone?: 'verm' | 'card' }) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const onVerm = tone === 'verm';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/v1/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          company,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setStatus('success');
        setMessage('You are in. We will write when your spot opens.');
      } else {
        setStatus('error');
        setMessage(json?.error?.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'success' ? (
        <motion.div
          key="done"
          role="status"
          initial={{ opacity: 0, transform: 'scale(0.97)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-3 rounded-2xl bg-paper p-4 text-coal"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pass text-paper">
            <Check size={19} strokeWidth={3} aria-hidden />
          </span>
          <p className="font-bold">{message}</p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={onSubmit}
          noValidate
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <label
            htmlFor="wl-email"
            className={cn('mb-2 block text-sm font-bold', onVerm ? 'text-coal' : 'text-ink')}
          >
            Your email
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              id="wl-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? 'wl-error' : undefined}
              className="h-13 min-w-0 flex-1 rounded-full border-2 border-transparent bg-paper px-5 text-base text-coal shadow-[inset_0_0_0_1px_rgb(22_20_18/0.18)] transition-[border-color] duration-150 placeholder:text-[#6e6a62] focus:border-coal focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className={cn('btn h-13 px-7 text-base', onVerm ? 'bg-coal text-paper hover:bg-coal-2' : 'btn-verm')}
            >
              {status === 'loading' ? 'Joining…' : 'Join'}
              {status !== 'loading' && <ArrowRight size={16} aria-hidden />}
            </button>
          </div>

          {/* Honeypot: visually hidden, off the a11y tree, ignored by humans. */}
          <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="wl-company">Company</label>
            <input
              id="wl-company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {status === 'error' && (
            <p
              id="wl-error"
              role="alert"
              className={cn('mt-2.5 text-sm font-bold', onVerm ? 'text-coal' : 'text-verm-text')}
            >
              {message}
            </p>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
