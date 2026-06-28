import { useState, useEffect, useRef } from 'react';

export default function Preloader({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'fadeout' | 'hidden'>('loading');
  const startTime = useRef(Date.now());
  const MIN_DURATION = 2800;

  useEffect(() => {
    const elapsed = Date.now() - startTime.current;
    const remaining = Math.max(0, MIN_DURATION - elapsed);

    const timer = setTimeout(() => {
      setPhase('fadeout');
      setTimeout(() => {
        setPhase('hidden');
        onFinish();
      }, 500);
    }, remaining);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#22549E] transition-opacity duration-500 ${
        phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative w-full max-w-md mx-auto flex flex-col items-center">
        <div className="cd-wrapper relative h-24 w-full mb-8">
          <div className="cd-disc absolute top-0 left-0 w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full cd-spin">
              <defs>
                <clipPath id="cd-hole">
                  <circle cx="50" cy="50" r="50" />
                </clipPath>
              </defs>
              <circle cx="50" cy="50" r="50" fill="#e0e0e0" />
              <circle cx="50" cy="50" r="40" fill="#c0c0c0" />
              <circle cx="50" cy="50" r="30" fill="#d0d0d0" />
              <circle cx="50" cy="50" r="20" fill="#b0b0b0" />
              <circle cx="50" cy="50" r="14" fill="#22549E" />
              <circle cx="50" cy="50" r="10" fill="#fff" opacity="0.3" />
              <circle cx="50" cy="50" r="4" fill="#ccc" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="#fff" strokeWidth="2" opacity="0.4" />
              <line x1="50" y1="10" x2="50" y2="90" stroke="#fff" strokeWidth="2" opacity="0.4" />
              <line x1="18" y1="18" x2="82" y2="82" stroke="#fff" strokeWidth="1.5" opacity="0.3" />
              <line x1="82" y1="18" x2="18" y2="82" stroke="#fff" strokeWidth="1.5" opacity="0.3" />
              <circle cx="50" cy="50" r="2" fill="#999" />
            </svg>
          </div>
        </div>

        <div className="h-10 mb-6 flex items-center justify-center">
          <span className="text-white text-2xl sm:text-3xl font-bold tracking-widest typewriter">
            LA MAISON CD
          </span>
        </div>

        <div className="w-64 sm:w-80 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full progress-bar-fill" />
        </div>

        <p className="text-white/60 text-xs mt-4 tracking-widest uppercase">
          MAKE IT SELF
        </p>
      </div>
    </div>
  );
}
