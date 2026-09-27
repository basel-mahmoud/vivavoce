'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, RotateCcw, Scissors, Smartphone } from 'lucide-react';
import { TearTicket } from '@/components/ui/TearTicket';
import { Loader } from '@/components/ui/Loader';
import { useAdmission } from '@/components/site/useAdmission';
import { cn } from '@/lib/cn';

/**
 * An ADMIT ONE slip for the early-access list: the close of every page, and
 * the whole of /waitlist (`size="page"`). Write your email on the slip, then
 * tear the stub off: pull it sideways, tap it, or press Enter or the arrow key
 * in the field. The stub is the button and tearing it sends you in; it stays
 * on until there is an email to send. When you are in, the slip is stamped
 * and the panel in the footer looks up, pleased.
 */
export function AdmitSlip({ size = 'close', fieldId }: { size?: 'close' | 'page'; fieldId?: string }) {
  const uid = useId();
  const id = fieldId ?? `${uid}-email`;
  const host = useRef<HTMLDivElement>(null);
  const done = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const slip = useAdmission(input);
  const [torn, setTorn] = useState(false);
  const page = size === 'page';

  const busy = slip.status === 'sending';
  const admitted = slip.status === 'in';

  useEffect(() => {
    if (admitted) done.current?.focus({ preventScroll: true });
  }, [admitted]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || admitted) return;
    if (!slip.ready) {
      slip.refused('submit');
      return;
    }
    // Enter and the arrow key tear the stub, exactly like pulling it.
    const stub = host.current?.querySelector<HTMLButtonElement>('.vv-ticket-stub');
    if (stub) stub.click();
    else void slip.send();
  };

  return (
    <div ref={host} className="vv-admit" data-size={size}>
      <TearTicket
        stubTone="cobalt"
        tearLabel="Get early access: tear off the stub"
        tornMessage="Stub torn off. Sending your email."
        canTear={slip.canTear}
        onRefused={slip.refused}
        ready={slip.ready && !admitted}
        onTear={() => {
          setTorn(true);
          void slip.send();
        }}
        stub={
          <>
            <span className="vv-stub-admit">Admit one</span>
            <span className="vv-stub-cta">Get early access</span>
            <span className="vv-stub-tear">
              <Scissors size={13} strokeWidth={2.4} aria-hidden />
              Tear here
            </span>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="vv-admit-body">
          <p className={cn('display leading-none', page ? 'text-[clamp(1.9rem,3.4vw,2.6rem)]' : 'text-[clamp(1.7rem,3.2vw,2.3rem)]')}>
            Admit one
          </p>
          <p className="vv-admit-sub">VivaVoce private beta. {page ? 'One seat, for you.' : 'Early access.'}</p>
          <div className="perf-rule vv-admit-perf" aria-hidden />
          {admitted ? (
            <div ref={done} tabIndex={-1} className="vv-admit-done" role="status">
              <span className="vv-admitted">Admitted</span>
              <p className="mt-3 font-bold leading-relaxed">{slip.message}</p>
              <a href="/download/apk" className="group mt-3 inline-flex min-h-11 items-center gap-1.5 font-bold text-cobalt-deep">
                <Smartphone size={16} aria-hidden />
                <span className="link-quiet">While you wait: the Android beta</span>
              </a>
            </div>
          ) : (
            <>
              <label htmlFor={id} className="vv-admit-label">
                Your email
              </label>
              <div className="vv-admit-field">
                <input
                  ref={input}
                  id={id}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={slip.email}
                  disabled={busy}
                  onChange={(e) => slip.write(e.target.value)}
                  onKeyDown={(e) => {
                    // The honeypot is a second text field, which stops the browser submitting
                    // the form on Enter by itself, so Enter submits it here.
                    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }}
                  placeholder="you@uni.edu"
                  aria-invalid={Boolean(slip.hint) || slip.status === 'error'}
                  aria-describedby={`${id}-note`}
                  className="vv-admit-input"
                />
                {torn ? null : (
                  <button type="submit" className="vv-admit-go" aria-label="Get early access" disabled={busy}>
                    <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
                  </button>
                )}
              </div>
              {/* Honeypot: visually hidden, off the a11y tree, ignored by humans. */}
              <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label htmlFor={`${id}-company`}>Company</label>
                <input
                  id={`${id}-company`}
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={slip.company}
                  onChange={(e) => slip.setCompany(e.target.value)}
                />
              </div>
              <div id={`${id}-note`} className="vv-admit-note" aria-live="polite">
                {busy ? (
                  <Loader kind="marking" size="sm" label="Writing you in" />
                ) : slip.status === 'error' ? (
                  <span className="text-verm-text">{slip.message}</span>
                ) : slip.hint ? (
                  <span className="text-verm-text">{slip.hint}</span>
                ) : torn ? null : (
                  <span>Then tear off the stub, or press Enter.</span>
                )}
              </div>
              {torn && slip.status === 'error' ? (
                <button type="button" className="btn btn-primary btn-sm mt-3 pointer-coarse:h-11" onClick={() => void slip.send()}>
                  <RotateCcw size={15} aria-hidden />
                  Try again
                </button>
              ) : null}
            </>
          )}
        </form>
      </TearTicket>
    </div>
  );
}
