import { useState, useEffect, useRef, useCallback } from "react";

const TOTAL_STORIES = 3;
const STORY_DURATION = 5000;

const s = {
  body: { background: "#111", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", margin: 0 },
  container: { width: 390, height: 844, position: "relative", borderRadius: 16, overflow: "hidden", background: "#0d0a1a", boxShadow: "0 30px 80px rgba(0,0,0,0.8)", userSelect: "none" },
  bg: { position: "absolute", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(72,30,180,0.55) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 80% 60%, rgba(100,20,140,0.35) 0%, transparent 55%), radial-gradient(ellipse 80% 80% at 50% 100%, rgba(20,10,60,0.9) 0%, transparent 70%), linear-gradient(175deg, #1a0d4a 0%, #0e0826 30%, #08061a 60%, #050310 100%)" },
  a1: { position: "absolute", top: "-10%", left: "-10%", width: "60%", height: "60%", borderRadius: "50%", background: "radial-gradient(circle, rgba(90,40,200,0.12) 0%, transparent 70%)", animation: "ambientFloat 8s ease-in-out infinite alternate", zIndex: 1 },
  a2: { position: "absolute", bottom: "10%", right: "-15%", width: "70%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(130,20,160,0.1) 0%, transparent 70%)", animation: "ambientFloat 10s ease-in-out infinite alternate-reverse", zIndex: 1 },
  progressRow: { position: "absolute", top: 14, left: 12, right: 12, display: "flex", gap: 4, zIndex: 10 },
  track: { flex: 1, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,0.25)", overflow: "hidden" },
  fill: (w) => ({ height: "100%", width: `${w * 100}%`, background: "#fff", borderRadius: 2, transition: "none" }),
  header: { position: "absolute", top: 28, left: 12, right: 12, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 },
  hLeft: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", overflow: "hidden" },
  uBlock: { display: "flex", flexDirection: "column", gap: 1 },
  uName: { fontSize: 13.5, fontWeight: 600, color: "#fff", letterSpacing: "0.01em", textShadow: "0 1px 4px rgba(0,0,0,0.4)" },
  uTime: { fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.02em" },
  hRight: { display: "flex", alignItems: "center", gap: 16 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 16px", zIndex: 10, background: "linear-gradient(to top, rgba(5,3,16,0.7) 0%, transparent 100%)" },
  bIcon: { background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: "50%" },
  tap: (side) => ({ position: "absolute", top: 0, bottom: 0, width: "40%", [side]: 0, zIndex: 5, cursor: "pointer", WebkitTapHighlightColor: "transparent", outline: "none", background: "transparent" }),
};

export default function Story() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const startRef = useRef(null);
  const elapsedRef = useRef(0);
  const rafRef = useRef(null);
  const curRef = useRef(0);

  const tick = useCallback(() => {
    if (pausedRef.current) { rafRef.current = requestAnimationFrame(tick); return; }
    const now = performance.now();
    elapsedRef.current = now - startRef.current;
    const p = Math.min(elapsedRef.current / STORY_DURATION, 1);
    setProgress(p);
    if (p < 1) { rafRef.current = requestAnimationFrame(tick); }
    else { const n = curRef.current + 1; if (n < TOTAL_STORIES) goTo(n, 0); }
  }, []);

  const goTo = useCallback((idx, from = 0) => {
    cancelAnimationFrame(rafRef.current);
    curRef.current = idx;
    setCurrent(idx);
    elapsedRef.current = from * STORY_DURATION;
    startRef.current = performance.now() - elapsedRef.current;
    setProgress(from);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => { goTo(0, 0); return () => cancelAnimationFrame(rafRef.current); }, []);

  const next = () => { if (curRef.current < TOTAL_STORIES - 1) goTo(curRef.current + 1, 0); };
  const prev = () => { if (curRef.current > 0) goTo(curRef.current - 1, 0); else goTo(0, 0); };
  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; startRef.current = performance.now() - elapsedRef.current; };

  return (
    <>
      <style>{`@keyframes ambientFloat { from { transform: translate(0,0) scale(1); opacity:.6 } to { transform: translate(6%,8%) scale(1.1); opacity:1 } } * { box-sizing:border-box; margin:0; padding:0 }`}</style>
      <div style={s.body}>
        <div style={s.container}>
          <div style={s.bg} />
          <div style={s.a1} />
          <div style={s.a2} />

          {/* Progress bars */}
          <div style={s.progressRow}>
            {Array.from({ length: TOTAL_STORIES }).map((_, i) => (
              <div key={i} style={s.track}>
                <div style={s.fill(i < current ? 1 : i === current ? progress : 0)} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div style={s.header}>
            <div style={s.hLeft}>
              <div style={s.avatar}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div style={s.uBlock}>
                <span style={s.uName}>Hard Reset</span>
                <span style={s.uTime}>just now</span>
              </div>
            </div>
            <div style={s.hRight}>
              <button style={s.iconBtn}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  <circle cx="14" cy="9" r="2" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button style={s.iconBtn}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tap zones */}
          <div style={s.tap("left")} onClick={prev} onPointerDown={pause} onPointerUp={resume} onPointerLeave={resume} />
          <div style={s.tap("right")} onClick={next} onPointerDown={pause} onPointerUp={resume} onPointerLeave={resume} />

          {/* Bottom bar — eye + ellipsis only */}
          <div style={s.bottomBar}>
            <button style={s.bIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button style={s.bIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

