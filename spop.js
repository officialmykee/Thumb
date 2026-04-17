// spop.js — Story Popup Component
// Include this file in index.html BEFORE the main <script type="text/babel"> block:
//   <script type="text/babel" src="spop.js"></script>

function StoryPopup({ story, onClose }) {
  const { useState: _useState, useEffect: _useEffect, useRef: _useRef } = React;
  const [progress, setProgress] = React.useState(0);
  const rafRef = React.useRef(null);
  const startRef = React.useRef(null);
  const DURATION = 5000; // 5 seconds per story

  React.useEffect(() => {
    if (!story) return;
    setProgress(0);
    startRef.current = null;

    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onClose();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story]);

  if (!story) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: story.bg || "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* Progress bar */}
      <div style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        height: 3,
        background: "rgba(255,255,255,0.35)",
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: "#fff",
          borderRadius: 2,
          transition: "width 0.05s linear",
        }} />
      </div>

      {/* Header: avatar + name + close */}
      <div style={{
        position: "absolute",
        top: 28,
        left: 14,
        right: 14,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          padding: 2,
          background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
          flexShrink: 0,
        }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "1.5px solid #000" }}>
            <img
              src={story.avatar}
              alt={story.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </div>
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 14, flex: 1 }}>{story.name}</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Story image */}
      <img
        src={story.avatar}
        alt={story.name}
        draggable={false}
        style={{
          width: "70%",
          maxWidth: 260,
          height: "auto",
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid rgba(255,255,255,0.25)",
          pointerEvents: "none",
        }}
      />

      {/* Story name label */}
      <p style={{
        marginTop: 22,
        color: "#fff",
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: "0.2px",
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
      }}>
        {story.name}'s Story
      </p>

      {/* Tap hint */}
      <p style={{
        marginTop: 8,
        color: "rgba(255,255,255,0.5)",
        fontSize: 12,
      }}>
        Tap anywhere to close
      </p>
    </div>
  );
}

