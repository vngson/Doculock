"use client";

import { useState, useEffect, useCallback } from "react";

const COLS = 3;
const ROWS = 3;

const SHATTER_TARGETS: Record<string, { tx: number; ty: number; rot: number }> = {
  "0-0": { tx: -1.5, ty: -1.8, rot: -45 },
  "0-1": { tx: 0, ty: -2.2, rot: 15 },
  "0-2": { tx: 1.5, ty: -1.8, rot: 40 },
  "1-0": { tx: -1.8, ty: 0, rot: -30 },
  "1-1": { tx: 0.05, ty: -0.05, rot: 5 },
  "1-2": { tx: 1.8, ty: 0, rot: 35 },
  "2-0": { tx: -1.5, ty: 1.8, rot: -35 },
  "2-1": { tx: 0, ty: 2.2, rot: -12 },
  "2-2": { tx: 1.5, ty: 1.8, rot: 28 },
};

export function IntroOverlay() {
  const [phase, setPhase] = useState<"show" | "shatter" | "fade" | "done">("show");

  const startAnimation = useCallback(() => {
    const shown = sessionStorage.getItem("intro-shown");
    if (shown) {
      setPhase("done");
      return;
    }

    const t1 = setTimeout(() => setPhase("shatter"), 900);
    const t2 = setTimeout(() => setPhase("fade"), 1600);
    const t3 = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem("intro-shown", "1");
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    const cleanup = startAnimation();
    return cleanup ?? (() => {});
  }, [startAnimation]);

  if (phase === "done") return null;

  const pieces: { row: number; col: number; key: string }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      pieces.push({ row: r, col: c, key: `${r}-${c}` });
    }
  }

  return (
    <div
      className={`intro-overlay ${phase === "fade" ? "fade-out" : ""}`}
      aria-hidden="true"
    >
      <div className="intro-grid">
        {pieces.map(({ row, col, key }) => {
          const bgX = col === 0 ? 0 : col === 1 ? 50 : 100;
          const bgY = row === 0 ? 0 : row === 1 ? 50 : 100;
          const target = SHATTER_TARGETS[key];
          const isShattered = phase === "shatter";

          return (
            <div
              key={key}
              className="intro-piece"
              style={{
                backgroundPosition: `${bgX}% ${bgY}%`,
                transform: isShattered
                  ? `translate(${target.tx * 50}vw, ${target.ty * 50}vh) rotate(${target.rot}deg) scale(0.2)`
                  : "none",
                opacity: isShattered ? 0 : 1,
                transition: isShattered
                  ? "transform 0.8s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)"
                  : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
