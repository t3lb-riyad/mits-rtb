import { useState, useEffect, useRef } from 'react';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInQuad(t: number): number {
  return t * t;
}

export default function Preloader({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'forward' | 'retract' | 'fadeout' | 'hidden'>('forward');
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  const FORWARD_DURATION = 2500;
  const RETRACT_DURATION = 600;
  const FADE_DURATION = 400;

  useEffect(() => {
    startTimeRef.current = performance.now();

    function frame(now: number) {
      const elapsed = now - startTimeRef.current;

      if (phase === 'forward') {
        const t = Math.min(elapsed / FORWARD_DURATION, 1);
        progressRef.current = easeInOutCubic(t) * 100;
        if (t >= 1) {
          setPhase('retract');
          startTimeRef.current = now;
        }
      } else if (phase === 'retract') {
        const t = Math.min(elapsed / RETRACT_DURATION, 1);
        progressRef.current = (1 - easeInQuad(t)) * 100;
        if (t >= 1) {
          setPhase('fadeout');
          startTimeRef.current = now;
        }
      } else if (phase === 'fadeout') {
        const t = Math.min(elapsed / FADE_DURATION, 1);
        if (t >= 1) {
          setPhase('hidden');
          onFinish();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, onFinish]);

  if (phase === 'hidden') return null;

  const pct = progressRef.current;
  const clipWidth = Math.max(0, Math.min(100, pct));
  const isFading = phase === 'fadeout';

  return (
    <div
      style={{
        opacity: isFading ? Math.max(0, 1 - (performance.now() - startTimeRef.current) / FADE_DURATION) : 1,
        transition: isFading ? undefined : 'none',
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#22549E] select-none"
    >
      <div className="relative w-full max-w-md mx-auto flex flex-col items-center px-6">
        <div className="relative h-28 w-full mb-6 flex items-center">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 flex items-center overflow-hidden"
            style={{ width: `${clipWidth}%`, left: 0 }}
          >
            <span className="text-white text-xl sm:text-2xl font-bold tracking-[0.15em] whitespace-nowrap">
              LA MAISON CD
            </span>
          </div>

          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: `calc(${clipWidth}% - 10px)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              className="w-14 h-14 sm:w-16 sm:h-16"
              style={{
                animation: phase === 'retract' || phase === 'fadeout'
                  ? 'cd-spin 0.8s linear infinite'
                  : 'cd-spin 1.2s linear infinite',
              }}
            >
              <defs>
                <linearGradient id="cd-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#fff" stopOpacity="0" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0.15" />
                </linearGradient>
                <radialGradient id="cd-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#e8e8e8" />
                  <stop offset="30%" stopColor="#d0d0d0" />
                  <stop offset="60%" stopColor="#c0c0c0" />
                  <stop offset="85%" stopColor="#b8b8b8" />
                  <stop offset="100%" stopColor="#a0a0a0" />
                </radialGradient>
                <clipPath id="cd-base">
                  <circle cx="50" cy="50" r="46" />
                </clipPath>
              </defs>
              <circle cx="50" cy="50" r="48" fill="#888" />
              <circle cx="50" cy="50" r="46" fill="url(#cd-grad)" />
              <circle cx="50" cy="50" r="38" fill="#b0b0b0" opacity="0.5" />
              <circle cx="50" cy="50" r="20" fill="#22549E" />
              <circle cx="50" cy="50" r="18" fill="url(#cd-shine)" />
              <circle cx="50" cy="50" r="7" fill="#ccc" />
              <circle cx="50" cy="50" r="5" fill="#aaa" />
              <circle cx="50" cy="50" r="2" fill="#888" />
              <line x1="8" y1="50" x2="92" y2="50" stroke="#fff" strokeWidth="1.5" opacity="0.25" />
              <line x1="50" y1="8" x2="50" y2="92" stroke="#fff" strokeWidth="1.5" opacity="0.25" />
              <line x1="20" y1="20" x2="80" y2="80" stroke="#fff" strokeWidth="1" opacity="0.15" />
              <line x1="80" y1="20" x2="20" y2="80" stroke="#fff" strokeWidth="1" opacity="0.15" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.2" />
            </svg>
          </div>
        </div>

        <p className="text-white/50 text-[10px] sm:text-xs mt-2 mb-6 tracking-[0.3em] uppercase">
          MAKE IT SELF
        </p>

        <div className="w-full max-w-[280px] sm:max-w-sm">
          <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${clipWidth}%` }}
            />
          </div>
          <p className="text-white/80 text-xs sm:text-sm mt-2 text-center font-mono tabular-nums">
            {Math.round(clipWidth)}%
          </p>
        </div>
      </div>
    </div>
  );
}
