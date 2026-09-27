'use client';

import { useRef, useState, type RefObject } from 'react';
import type { TearAttempt } from '@/components/ui/TearTicket';
import { OFFLINE, emailHint, refusal } from './text';

export type AdmissionStatus = 'idle' | 'sending' | 'in' | 'error';

/**
 * The panel in the footer listens for this: it cheers when someone is let in
 * and one examiner frowns at an email that will not do (PanelLedge).
 */
export const PANEL_EVENT = 'vv:panel';
export type PanelMood = 'pleased' | 'sceptical';

export function tellPanel(mood: PanelMood) {
  window.dispatchEvent(new CustomEvent<{ mood: PanelMood }>(PANEL_EVENT, { detail: { mood } }));
}

/**
 * One admission slip's state: the email written on it, the honeypot, and the
 * trip to the waitlist API. Shared by the close on every page and /waitlist,
 * so both slips tear, refuse and admit the same way. Field names match the
 * API contract. `input` is the email field, focused when a tear is refused.
 */
export function useAdmission(input: RefObject<HTMLInputElement | null>) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<AdmissionStatus>('idle');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState('');
  const current = useRef<AdmissionStatus>('idle');

  const move = (next: AdmissionStatus) => {
    current.current = next;
    setStatus(next);
  };

  const send = async () => {
    if (current.current === 'sending' || current.current === 'in') return;
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
        tellPanel('pleased');
      } else {
        move('error');
        setMessage(refusal(json?.error?.code));
      }
    } catch {
      move('error');
      setMessage(OFFLINE);
    }
  };

  /** The stub may come off once there is a plausible email on the slip (or you are in). */
  const canTear = () => current.current === 'in' || current.current === 'sending' || !emailHint(email);

  /**
   * A tear refused for want of an email: say so under the field. The panel's
   * Structure frowns. Focus goes to the field for keys and mice, not for a
   * thumb, so a tap never throws a keyboard up over the page unasked.
   */
  const refused = (attempt: TearAttempt | 'submit') => {
    setHint(emailHint(email));
    tellPanel('sceptical');
    const byKeys = attempt === 'keyboard' || attempt === 'submit';
    const byMouse = attempt === 'press' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (byKeys || byMouse) input.current?.focus();
  };

  const write = (value: string) => {
    setEmail(value);
    if (hint) setHint('');
  };

  return {
    email,
    write,
    company,
    setCompany,
    status,
    message,
    hint,
    ready: !emailHint(email),
    send,
    canTear,
    refused,
  };
}
