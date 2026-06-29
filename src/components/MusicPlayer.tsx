"use client";

import { useEffect, useRef, useState } from "react";

// Papertrail leads; the rest follow, then it loops. Crossfade via two audio
// elements: as the foreground nears its end, the next starts at 0 volume and
// the two ramp past each other over FADE seconds.
const TRACKS = [
  { name: "Papertrail", src: "/audio/Papertrail.wav" },
  { name: "DREAM", src: "/audio/DREAM.wav" },
  { name: "Orange Crush", src: "/audio/orange-crush.wav" },
  { name: "Saltwater Sorbet", src: "/audio/Saltwatr-Sorbet.wav" },
];
const FADE = 3; // crossfade seconds

export function MusicPlayer() {
  const a = useRef<HTMLAudioElement>(null);
  const b = useRef<HTMLAudioElement>(null);
  // Mutable playback state — kept in a ref so audio event handlers never read
  // a stale closure.
  const st = useRef({ active: 0, cur: 0, fading: false, vol: 0.6 });
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [vol, setVol] = useState(0.6);

  const els = () => [a.current!, b.current!] as const;

  function ramp(el: HTMLAudioElement, to: number, onDone?: () => void) {
    const from = el.volume;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / (FADE * 1000));
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
      else onDone?.();
    };
    requestAnimationFrame(step);
  }

  function crossfade() {
    const s = st.current;
    if (s.fading) return;
    s.fading = true;
    const curEl = els()[s.active];
    const nextEl = els()[s.active === 0 ? 1 : 0];
    const nextIdx = (s.cur + 1) % TRACKS.length;
    nextEl.src = TRACKS[nextIdx].src;
    nextEl.currentTime = 0;
    nextEl.volume = 0;
    nextEl.play().catch(() => {});
    ramp(nextEl, s.vol);
    ramp(curEl, 0, () => {
      curEl.pause();
      s.fading = false;
    });
    s.active = s.active === 0 ? 1 : 0;
    s.cur = nextIdx;
    setCur(nextIdx);
  }

  // Attach end-of-track watchers once.
  useEffect(() => {
    const onTime = (el: HTMLAudioElement) => {
      const s = st.current;
      if (el !== els()[s.active] || s.fading || !el.duration) return;
      if (el.duration - el.currentTime <= FADE) crossfade();
    };
    const [ea, eb] = els();
    const fa = () => onTime(ea);
    const fb = () => onTime(eb);
    ea.addEventListener("timeupdate", fa);
    eb.addEventListener("timeupdate", fb);
    ea.src = TRACKS[0].src; // preload the opener; playback waits for a click
    ea.volume = st.current.vol;
    return () => {
      ea.removeEventListener("timeupdate", fa);
      eb.removeEventListener("timeupdate", fb);
    };
    // Mount-once: crossfade reads only refs + stable setters, no stale capture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    if (playing) {
      els().forEach((e) => e.pause());
      setPlaying(false);
    } else {
      els()[st.current.active].play().catch(() => {});
      setPlaying(true);
    }
  }

  function jump(i: number) {
    const s = st.current;
    els().forEach((e) => e.pause());
    const el = els()[s.active];
    el.src = TRACKS[i].src;
    el.currentTime = 0;
    el.volume = s.vol;
    el.play().catch(() => {});
    s.cur = i;
    s.fading = false;
    setCur(i);
    setPlaying(true);
  }

  function changeVol(v: number) {
    st.current.vol = v;
    setVol(v);
    if (!st.current.fading) els()[st.current.active].volume = v;
  }

  return (
    <>
      <audio ref={a} preload="none" />
      <audio ref={b} preload="none" />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 pointer-events-none">
        <div
          className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2 shadow-[0_8px_40px_-12px_rgba(139,92,246,0.5)] backdrop-blur-2xl"
          style={{ WebkitBackdropFilter: "blur(24px)" }}
        >
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet/90 text-white transition hover:brightness-110"
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="3.5" height="12" rx="1" />
                <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 1.5v11l9-5.5z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-1 overflow-x-auto">
            {TRACKS.map((t, i) => (
              <button
                key={t.src}
                onClick={() => jump(i)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition ${
                  i === cur
                    ? "bg-violet/25 text-fg"
                    : "text-muted hover:bg-white/5 hover:text-fg"
                }`}
              >
                {i === cur && playing && (
                  <span className="mr-1 inline-block animate-pulse text-violet-glow">♪</span>
                )}
                {t.name}
              </button>
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={vol}
            onChange={(e) => changeVol(Number(e.target.value))}
            aria-label="Volume"
            className="hidden h-1 w-20 cursor-pointer accent-violet sm:block"
          />
        </div>
      </div>
    </>
  );
}
