'use client';

import { useEffect, useRef, useState, type FormEvent, type SyntheticEvent } from 'react';
import { ArrowRight, Scissors, Smartphone } from 'lucide-react';
import { TearTicket } from '@/components/ui/TearTicket';
import { Loader } from '@/components/ui/Loader';
import { PenTick } from './PenTick';
import { OFFLINE, REFUSED, emailHint, refusal } from './text';

type Status = 'idle' | 'sending' | 'in' | 'error';

/**
 * The waitlist page's admission slip. Write your email on it and press Get
 * early access: the key shows the pen at work while it sends, then the stub
 * tears itself off and the examiner ticks you in. Tearing the stub by hand
 * sends it too, once there is an email to send. Errors are said in the
 * page's own words, under the field. Field names and ids are stable
 * (analytics and the API).
 */
export function WaitlistForm() {
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const admitted = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState('');
  const state = useRef<Status>('idle');

  const move = (next: Status) => {
    state.current = next;
    setStatus(next);
  };

  useEffect(() => {
    if (status === 'in') admitted.current?.focus({ preventScroll: true });
  }, [status]);

  const send = async () => {
    if (state.current === 'sending' || state.current === 'in') return;
    move('sending');
    setMessage('');
    try {
      const res = await fetch('/api/v1/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), company, referrer: document.referrer || undefined }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: { code?: string } } | null;
      if (res.ok && json?.ok) {
        move('in');
        setMessage('You are in. We will write when your spot opens.');
        // The stub is yours: it comes off on its own.
        host.current?.querySelector<HTMLButtonElement>('.vv-ticket-stub')?.click();
      } else {
        move('error');
        setMessage(refusal(json?.error?.code));
      }
    } catch {
      move('error');
      setMessage(OFFLINE);
    }
  };

  const check = () => {
    const h = emailHint(email);
    setHint(h);
    if (h) input.current?.focus();
    return !h;
  };

  /** The stub will not tear without an email to send (once in, it tears freely). */
  const guard = (e: SyntheticEvent) => {
    if (state.current === 'in' || state.current === 'sending' || !emailHint(email)) return;
    e.preventDefault();
    e.stopPropagation();
    check();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (check()) void send();
  };

  const busy = status === 'sending';
  const done = status === 'in';
  const note = hint || (status === 'error' ? message : '');

  return (
    <div
      ref={host}
      className="vv-slip-wl"
      onPointerDownCapture={(e) => {
        if ((e.target as Element).closest('.vv-ticket-stub')) guard(e);
      }}
      onClickCapture={(e) => {
        if ((e.target as Element).closest('.vv-ticket-stub')) guard(e);
      }}
      onKeyDownCapture={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).closest('.vv-ticket-stub')) guard(e);
      }}
    >
      <TearTicket
        stubTone="cobalt"
        tearLabel="Tear off the stub to get early access"
        tornMessage="Stub torn off."
        onTear={() => {
          if (state.current === 'idle' || state.current === 'error') void send();
        }}
        stub={
          <>
            <span className="whitespace-nowrap text-[0.62rem] font-black tracking-[0.14em]">ADMIT ONE</span>
            <span className="text-[1.02rem] font-black leading-[1.1]">Get early access</span>
            <span className="inline-flex items-center gap-1 text-[0.7rem] font-bold opacity-80">
              <Scissors size={12} aria-hidden />
              Tear here
            </span>
          </>
        }
      >
        <div className="vv-wl-body">
          <p className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-none">Admit one</p>
          <p className="mt-2 text-sm font-bold text-coal/70">VivaVoce private beta. One seat, for you.</p>
          <div className="perf-rule my-5" aria-hidden />

          {done ? (
            <div ref={admitted} tabIndex={-1} className="vv-wl-done" role="status">
              <PenTick delay={420} className="vv-wl-tick" />
              <p className="display text-[clamp(1.8rem,3vw,2.3rem)] leading-none">Admitted.</p>
              <p className="mt-3 max-w-[26rem] text-base font-semibold leading-relaxed">{message}</p>
              <a href="/download/apk" className="group mt-5 inline-flex items-center gap-1.5 font-bold text-cobalt-deep">
                <Smartphone size={16} aria-hidden />
                <span className="link-quiet">While you wait: the Android beta</span>
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <label htmlFor="wl-email" className="block text-[0.72rem] font-black tracking-[0.12em] text-coal/70">
                YOUR EMAIL
              </label>
              <input
                ref={input}
                id="wl-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                disabled={busy}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (hint) setHint('');
                }}
                onKeyDown={(e) => {
                  // The honeypot is a second text field, which stops Enter submitting
                  // the form by itself, so Enter submits it here.
                  if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }}
                placeholder="you@university.edu"
                aria-invalid={Boolean(hint) || (status === 'error' && message === REFUSED.bad_request)}
                aria-describedby="wl-note"
                className="vv-wl-input"
              />
              {/* Honeypot: visually hidden, off the a11y tree, ignored by humans. */}
              <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="wl-company">Company</label>
                <input
                  id="wl-company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <p id="wl-note" className="vv-wl-note" aria-live="polite">
                {note ? <span className="text-verm-text">{note}</span> : 'One email when your spot opens. No spam.'}
              </p>
              <button type="submit" className="btn btn-primary btn-lg vv-wl-submit" aria-busy={busy || undefined}>
                {busy ? (
                  <>
                    <Loader kind="marking" size="sm" glyphOnly />
                    Writing you in
                  </>
                ) : (
                  <>
                    Get early access
                    <ArrowRight size={17} aria-hidden />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </TearTicket>
    </div>
  );
}
