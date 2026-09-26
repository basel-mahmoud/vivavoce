'use client';

import { cn } from '@/lib/cn';
import { AXES, ROUNDS, weakestIndex } from './data';
import { TypeLine } from './TypeLine';
import type { RoomOverlays, RoundState } from './Director';
import styles from './room.module.css';

/**
 * The room's words, as notes pinned above the panel (never over a face or a raised mark): the
 * examiner's question or follow-up with a red-pen leader down to the speaker, and the candidate's
 * answer in blue ink in the same slot. The Director positions them every frame; React only changes
 * their words when the phase does.
 */
export function RoomTags({ round, reduce, overlaysRef }: { round: RoundState; reduce: boolean; overlaysRef: React.RefObject<RoomOverlays> }) {
  const outro = round.mode === 'outro';
  const script = ROUNDS[outro ? 0 : round.index % ROUNDS.length]!;
  const asking = !outro && round.phase === 'ask';
  const following = outro || round.phase === 'follow';
  const speaker = asking ? script.asker : following ? weakestIndex(script.scores) : -1;
  const words = asking ? script.question : following ? script.followUp : '';
  const answering = round.mode === 'round' && (round.phase === 'listen' || round.phase === 'mark');

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      <div
        ref={(el) => {
          overlaysRef.current.leader = el;
        }}
        className="absolute left-0 top-0 h-px w-[1.5px] origin-top bg-verm-text opacity-0 transition-opacity duration-200"
      />
      <div
        ref={(el) => {
          overlaysRef.current.tag = el;
        }}
        className="absolute left-0 top-0 w-[min(17rem,calc(100vw-2rem))] rounded-[0.9rem] border border-line bg-card px-3.5 pb-2.5 pt-2 opacity-0 shadow-paper transition-opacity duration-200"
      >
        {speaker >= 0 && (
          <>
            <p className="text-[0.72rem] font-bold text-verm-text">
              {AXES[speaker]!.label}
              {following ? ', follow-up' : ', asking'}
            </p>
            <p className="mt-0.5 min-h-[2.5em] text-[0.94rem] font-bold leading-snug text-ink">
              <TypeLine key={`${round.mode}-${round.index}-${round.phase}`} text={words} instant={reduce} cps={44} caret={false} />
            </p>
          </>
        )}
      </div>
      <div
        ref={(el) => {
          overlaysRef.current.answer = el;
        }}
        className={cn(
          styles.answer,
          'absolute left-0 top-0 rounded-[0.9rem] border border-ink-blue/30 bg-card px-3.5 pb-2.5 pt-2 opacity-0 shadow-paper transition-opacity duration-200',
        )}
      >
        {answering && (
          <>
            <p className="text-[0.72rem] font-bold text-ink-blue">You, answering</p>
            <p className="mt-0.5 font-semibold leading-snug text-ink-blue">
              <TypeLine key={`${round.index}-answer`} text={script.answer} instant={reduce} cps={40} />
            </p>
          </>
        )}
      </div>
    </div>
  );
}
