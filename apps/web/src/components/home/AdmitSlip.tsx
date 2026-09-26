'use client';

import { useId, useRef, useState, type FormEvent, type SyntheticEvent } from 'react';
import { ArrowRight, Scissors } from 'lucide-react';
import { TearTicket } from '@/components/ui/TearTicket';
import { Loader } from '@/components/ui/Loader';
import { looksLikeEmail } from './email';

type Status = 'idle' | 'sending' | 'in' | 'error';

/**
 * The close: an ADMIT ONE slip for the early-access list. Write your email
 * on the slip, then tear the stub off (pull it, click it, or press Enter in
 * the field): the stub is the button, and tearing it sends you in. It will
 * not tear without an email. Field names match the waitlist API.
 */
export function AdmitSlip() {
  const uid = useId();
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState('');
  const [torn, setTorn] = useState(false);

  const send = async () => {
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/v1/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), company, referrer: document.referrer || undefined }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
      if (res.ok && json?.ok) {
        setStatus('in');
        setMessage('You are in. We will write when your spot opens.');
      } else {
        setStatus('error');
        setMessage(json?.error?.message ?? 'That did not go through. Try again.');
      }
    } catch {
      setStatus('error');
      setMessage('No connection. Check it and try again.');
    }
  };

  /** Hold the stub down until there is an email to send. */
  const guard = (e: SyntheticEvent) => {
    if (looksLikeEmail(email)) return;
    e.preventDefault();
    e.stopPropagation();
    setHint(email.trim() ? 'That email looks incomplete. Check it, then tear.' : 'Write your email on the slip first.');
    input.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (status === 'sending' || status === 'in') return;
    if (!looksLikeEmail(email)) {
      setHint(email.trim() ? 'That email looks incomplete. Check it, then tear.' : 'Write your email on the slip first.');
      return;
    }
    // Enter in the field tears the stub, exactly like pulling it.
    const stub = host.current?.querySelector<HTMLButtonElement>('.vv-ticket-stub');
    if (stub) stub.click();
    else void send();
  };

  const done = status === 'in';

  return (
    <div
      ref={host}
      className="vv-admit"
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
        tearLabel="Get early access"
        tornMessage="Stub torn off. Sending your email."
        onTear={() => {
          setTorn(true);
          void send();
        }}
        stub={
          <>
            <span className="text-[0.62rem] font-black tracking-[0.16em]">ADMIT ONE</span>
            <span className="text-[1.02rem] font-black leading-[1.1]">Get early access</span>
            <span className="inline-flex items-center gap-1 text-[0.7rem] font-bold opacity-80">
              <Scissors size={12} aria-hidden />
              Tear here
            </span>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="vv-admit-body">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="display text-[clamp(1.7rem,3.2vw,2.3rem)] leading-none">Admit one</p>
              <p className="mt-1.5 text-sm font-bold text-coal/70">VivaVoce private beta. Early access.</p>
            </div>
          </div>
          <div className="perf-rule my-4" aria-hidden />
          {done ? (
            <div className="vv-admit-done">
              <span className="vv-admitted">Admitted</span>
              <p className="mt-3 font-bold">{message}</p>
            </div>
          ) : (
            <>
              <label htmlFor={`${uid}-email`} className="block text-[0.72rem] font-black tracking-[0.12em] text-coal/70">
                YOUR EMAIL
              </label>
              <input
                ref={input}
                id={`${uid}-email`}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                disabled={status === 'sending'}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (hint) setHint('');
                }}
                onKeyDown={(e) => {
                  // The honeypot is a second text field, which stops the browser submitting
                  // the form on Enter by itself, so Enter submits it here.
                  if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }}
                placeholder="you@university.edu"
                aria-invalid={Boolean(hint) || status === 'error'}
                aria-describedby={`${uid}-note`}
                className="vv-admit-input"
              />
              <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label htmlFor={`${uid}-company`}>Company</label>
                <input
                  id={`${uid}-company`}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div id={`${uid}-note`} className="mt-2.5 min-h-[1.4rem] text-[0.85rem] font-bold" aria-live="polite">
                {status === 'sending' ? (
                  <Loader kind="marking" size="sm" label="Writing you in" />
                ) : status === 'error' ? (
                  <span className="text-verm-text">{message}</span>
                ) : hint ? (
                  <span className="text-verm-text">{hint}</span>
                ) : (
                  <span className="text-coal/65">
                    {torn ? '' : 'Then tear off the stub, or press Enter.'}
                  </span>
                )}
              </div>
              {torn && status === 'error' ? (
                <button type="button" className="btn btn-primary btn-sm mt-3 pointer-coarse:h-11" onClick={() => void send()}>
                  Get early access
                  <ArrowRight size={15} aria-hidden />
                </button>
              ) : null}
            </>
          )}
        </form>
      </TearTicket>
      <p className="sr-only" aria-live="polite">
        {done ? message : ''}
      </p>
    </div>
  );
}
