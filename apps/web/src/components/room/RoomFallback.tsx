import { AXES, ROUNDS, weakestIndex } from './data';

/**
 * Flat rendition of the room for browsers without WebGL: the cobalt bench
 * and the five paddles, marked with the first example round. Paddles keep the
 * 3D room's paper rim so they hold their edge on the night canvas.
 */
export function RoomFallback() {
  const scores = ROUNDS[0]!.scores;
  const weakest = weakestIndex(scores);
  return (
    <div className="flex h-full w-full items-end justify-center px-4 pb-[12%] md:justify-end md:pr-[6%]">
      <div className="w-full max-w-[40rem]">
        <div className="flex items-end justify-between gap-2 px-3">
          {AXES.map((a, i) => (
            <div key={a.key} className="flex flex-col items-center gap-2">
              <span
                className={`marks grid aspect-square w-[clamp(3rem,7vw,4.6rem)] place-items-center rounded-full text-[clamp(1rem,2.2vw,1.5rem)] font-bold ring-2 ring-paper ${
                  i === weakest ? 'bg-verm text-coal' : 'bg-coal text-paper'
                }`}
              >
                {scores[i]}
              </span>
              <span className="h-10 w-1 rounded-full bg-coal dark:bg-paper-mut" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-cobalt px-3 py-4">
          <div className="grid grid-cols-5 gap-2">
            {AXES.map((a) => (
              <span
                key={a.key}
                className="truncate rounded-md bg-paper px-1.5 py-1 text-center text-[0.7rem] font-black text-coal sm:text-xs"
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
