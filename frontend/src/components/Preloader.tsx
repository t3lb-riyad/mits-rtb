import { useState, useEffect, useRef } from 'react';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInQuad(t: number): number {
  return t * t;
}

const FULL_TEXT = 'LA MAISON CD';

export default function Preloader({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'forward' | 'retract' | 'fadeout' | 'hidden'>('forward');
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const mountedRef = useRef(true);
  const phaseStartRef = useRef(0);

  const FORWARD_DURATION = 2500;
  const RETRACT_DURATION = 600;
  const FADE_DURATION = 400;

  useEffect(() => {
    mountedRef.current = true;
    phaseStartRef.current = performance.now();

    function frame(now: number) {
      if (!mountedRef.current) return;
      const elapsed = now - phaseStartRef.current;

      if (phase === 'forward') {
        const t = Math.min(elapsed / FORWARD_DURATION, 1);
        setProgress(easeInOutCubic(t) * 100);
        if (t >= 1) {
          setPhase('retract');
          phaseStartRef.current = now;
        }
      } else if (phase === 'retract') {
        const t = Math.min(elapsed / RETRACT_DURATION, 1);
        setProgress((1 - easeInQuad(t)) * 100);
        if (t >= 1) {
          setPhase('fadeout');
          phaseStartRef.current = now;
          setOpacity(1);
        }
      } else if (phase === 'fadeout') {
        const t = Math.min(elapsed / FADE_DURATION, 1);
        setOpacity(1 - t);
        if (t >= 1) {
          setPhase('hidden');
          onFinish();
          return;
        }
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return () => { mountedRef.current = false; };
  }, [phase, onFinish]);

  if (phase === 'hidden') return null;

  const clipWidth = Math.max(0, Math.min(100, progress));

  return (
    <div
      style={{ opacity }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#22549E] select-none"
    >
      <div className="flex flex-col items-center px-6">
        <div className="relative flex items-center justify-center mb-8">
          <span className="invisible text-5xl sm:text-6xl font-bold tracking-[0.12em] whitespace-nowrap leading-none">
            {FULL_TEXT}
          </span>

          <div
            className="absolute inset-0 overflow-hidden flex items-center"
            style={{ width: `${clipWidth}%` }}
          >
            <span className="text-white text-5xl sm:text-6xl font-bold tracking-[0.12em] whitespace-nowrap leading-none">
              {FULL_TEXT}
            </span>
          </div>

          <div
            className="absolute"
            style={{
              left: `${clipWidth}%`,
              top: '50%',
              transform: 'translate(6px, -50%)',
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

        <p className="text-[11px] sm:text-xs mb-8 tracking-[0.3em] uppercase shimmer-gold">
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
