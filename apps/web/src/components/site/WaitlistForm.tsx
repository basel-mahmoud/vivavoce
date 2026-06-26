'use client';

import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Status = 'idle' | 'loading' | 'success' | 'error';

const personas = [
  { value: 'student', label: 'Oral exam / viva' },
  { value: 'interview', label: 'Interviews' },
  { value: 'presentation', label: 'Presentations' },
  { value: 'language', label: 'Language' },
] as const;

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [persona, setPersona] = useState<string | undefined>();
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
          persona,
          company,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setStatus('success');
        setMessage('You’re on the list. We’ll be in touch as we open spots.');
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
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border border-sage/40 bg-sage/10 px-5 py-4 text-sm text-ink"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage/20 text-sage">
          <Check size={18} />
        </span>
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full" noValidate>
      <div className={cn('flex flex-col gap-3', !compact && 'sm:flex-row')}>
        <div className="flex-1">
          <label htmlFor="wl-email" className="sr-only">
            Email address
          </label>
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
            className="h-12 w-full rounded-full border border-line bg-surface px-5 text-ink placeholder:text-faint focus-visible:border-ember focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ember px-6 font-medium text-[#16130f] transition-colors hover:bg-ember-deep hover:text-white disabled:opacity-60"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Joining…
            </>
          ) : (
            <>
              Join the list <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {!compact && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-xs text-faint">
            What are you practising for? (optional)
          </legend>
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPersona(persona === p.value ? undefined : p.value)}
                aria-pressed={persona === p.value}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                  persona === p.value
                    ? 'border-ember bg-ember/10 text-ink'
                    : 'border-line text-muted hover:text-ink',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Honeypot — visually hidden, off the a11y tree, ignored by humans. */}
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
        <p role="alert" className="mt-3 text-sm text-live">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs text-faint">
        No spam. We email when your spot opens, and you can leave anytime.
      </p>
    </form>
  );
}
