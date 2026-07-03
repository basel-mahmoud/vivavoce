'use client';

import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

/** Works on any tile surface. Field names/ids are stable (analytics + backend). */
export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

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

  if (status === 'success') {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl bg-paper p-4 text-ink">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pass text-paper">
          <Check size={18} strokeWidth={3} />
        </span>
        <p className="text-sm font-bold">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="wl-email" className="sr-only">
        Email
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
          className="h-13 min-w-0 flex-1 rounded-full border border-[rgba(22,20,18,0.25)] bg-paper px-5 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="pressable inline-flex h-13 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-ink px-6 py-3 text-base font-bold text-paper transition-colors duration-150 hover:bg-[#2E2B27] disabled:opacity-60"
        >
          {status === 'loading' ? 'Joining…' : 'Join'}
          {status !== 'loading' && <ArrowRight size={16} />}
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
        <p role="alert" className="mt-2.5 text-sm font-bold text-ink">
          {message}
        </p>
      )}
    </form>
  );
}
