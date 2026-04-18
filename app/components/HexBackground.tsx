"use client";

import { useEffect, useRef } from "react";

/* ── config ── */
const CFG = {
  hexSize: 35,
  hexGap: 15,
  connectionDist: 120,
  mouseRadius: 180,
  baseAlpha: 0.06,
  activeAlpha: 0.25,
  particleCount: 20,
};

function hexRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ── data types (plain objects for perf) ── */
interface Hex {
  x: number;
  y: number;
  size: number;
  curAlpha: number;
  pulseOff: number;
  pulseSpd: number;
}

interface Conn {
  a: number;
  b: number;
  alpha: number;
}

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export function HexBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    w: number;
    h: number;
    hexes: Hex[];
    conns: Conn[];
    dots: Dot[];
    mx: number;
    my: number;
    raf: number;
  } | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    /* ── state ── */
    const canvas: HTMLCanvasElement = cvs;
    const context: CanvasRenderingContext2D = ctx;

    const S = {
      w: 0,
      h: 0,
      hexes: [] as Hex[],
      conns: [] as Conn[],
      dots: [] as Dot[],
      mx: 0,
      my: 0,
      raf: 0,
    };
    stateRef.current = S;

    /* ── build grid ── */
    function buildGrid() {
      S.hexes = [];
      const hW = CFG.hexSize * Math.sqrt(3);
      const hH = CFG.hexSize * 2;
      const cols = Math.ceil(S.w / (hW + CFG.hexGap)) + 2;
      const rows = Math.ceil(S.h / (hH * 0.75 + CFG.hexGap)) + 2;

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const x =
            c * (hW + CFG.hexGap) + ((r % 2) * (hW + CFG.hexGap)) / 2;
          const y = r * (hH * 0.75 + CFG.hexGap);
          if (
            x >= -CFG.hexSize &&
            x <= S.w + CFG.hexSize &&
            y >= -CFG.hexSize &&
            y <= S.h + CFG.hexSize
          ) {
            S.hexes.push({
              x,
              y,
              size: Math.max(1, CFG.hexSize),
              curAlpha: CFG.baseAlpha,
              pulseOff: Math.random() * Math.PI * 2,
              pulseSpd: 0.5 + Math.random() * 0.5,
            });
          }
        }
      }

      /* connections */
      S.conns = [];
      for (let i = 0; i < S.hexes.length; i++) {
        for (let j = i + 1; j < S.hexes.length; j++) {
          const dx = S.hexes[j].x - S.hexes[i].x;
          const dy = S.hexes[j].y - S.hexes[i].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CFG.connectionDist && d > CFG.hexSize) {
            S.conns.push({ a: i, b: j, alpha: 0 });
          }
        }
      }
    }

    /* ── particles ── */
    function initDots() {
      S.dots = [];
      for (let i = 0; i < CFG.particleCount; i++) {
        S.dots.push({
          x: Math.random() * S.w,
          y: Math.random() * S.h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.3,
        });
      }
    }

    /* ── resize ── */
    function onResize() {
      S.w = window.innerWidth;
      S.h = window.innerHeight;
      canvas.width = S.w;
      canvas.height = S.h;
      buildGrid();
    }

    /* ── draw hex ── */
    function drawHex(h: Hex, t: number) {
      const dx = S.mx - h.x;
      const dy = S.my - h.y;
      const md = Math.sqrt(dx * dx + dy * dy);
      const pulse = Math.sin(t * h.pulseSpd + h.pulseOff) * 0.5 + 0.5;
      const target =
        md < CFG.mouseRadius
          ? CFG.baseAlpha +
            (CFG.activeAlpha - CFG.baseAlpha) *
              (1 - md / CFG.mouseRadius)
          : CFG.baseAlpha;
      h.curAlpha += (target - h.curAlpha) * 0.1;
      h.curAlpha = Math.max(0, Math.min(1, h.curAlpha + pulse * 0.05));

      const verts: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        verts.push({
          x: h.x + h.size * Math.cos(a),
          y: h.y + h.size * Math.sin(a),
        });
      }
      context.beginPath();
      context.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) context.lineTo(verts[i].x, verts[i].y);
      context.closePath();
      context.strokeStyle = hexRgba("#00C0FF", h.curAlpha);
      context.lineWidth = 1;
      context.stroke();
    }

    /* ── draw connection ── */
    function drawConn(c: Conn) {
      const ha = S.hexes[c.a];
      const hb = S.hexes[c.b];
      const mx = (ha.x + hb.x) / 2;
      const my = (ha.y + hb.y) / 2;
      const md = Math.sqrt(
        (S.mx - mx) * (S.mx - mx) + (S.my - my) * (S.my - my),
      );
      const avg = (ha.curAlpha + hb.curAlpha) / 2;
      c.alpha = md < CFG.mouseRadius ? avg * 0.6 : avg * 0.3;
      if (c.alpha < 0.01) return;

      const g = context.createLinearGradient(ha.x, ha.y, hb.x, hb.y);
      g.addColorStop(0, hexRgba("#00C0FF", c.alpha));
      g.addColorStop(0.5, hexRgba("#BC8CFF", c.alpha * 0.7));
      g.addColorStop(1, hexRgba("#00C0FF", c.alpha));

      context.beginPath();
      context.moveTo(ha.x, ha.y);
      context.lineTo(hb.x, hb.y);
      context.strokeStyle = g;
      context.lineWidth = 0.5;
      context.stroke();
    }

    /* ── draw particle ── */
    function drawDot(p: Dot, t: number) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = S.w;
      if (p.x > S.w) p.x = 0;
      if (p.y < 0) p.y = S.h;
      if (p.y > S.h) p.y = 0;

      const dx = S.mx - p.x;
      const dy = S.my - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 150 && d > 0) {
        p.vx += (dx / d) * 0.02;
        p.vy += (dy / d) * 0.02;
      }
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 1) {
        p.vx = (p.vx / spd) * 1;
        p.vy = (p.vy / spd) * 1;
      }

      const pulse = Math.sin(t * 3 + p.x) * 0.3 + 0.7;
      const sz = Math.max(0.1, p.size);

      context.beginPath();
      context.arc(p.x, p.y, sz, 0, Math.PI * 2);
      context.fillStyle = hexRgba("#00C0FF", p.alpha * pulse);
      context.fill();

      context.beginPath();
      context.arc(p.x, p.y, sz * 3, 0, Math.PI * 2);
      context.fillStyle = hexRgba("#00C0FF", p.alpha * 0.1 * pulse);
      context.fill();
    }

    /* ── frame ── */
    function frame(time: number) {
      const t = time * 0.001;

      context.fillStyle = "transparent";
      context.clearRect(0, 0, S.w, S.h);

      /* mouse glow */
      const cg = context.createRadialGradient(
        S.mx, S.my, 0,
        S.mx, S.my, CFG.mouseRadius * 1.5,
      );
      cg.addColorStop(0, "rgba(0, 192, 255, 0.02)");
      cg.addColorStop(0.5, "rgba(188, 140, 255, 0.015)");
      cg.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = cg;
      context.fillRect(0, 0, S.w, S.h);

      S.hexes.forEach((h) => drawHex(h, t));
      S.conns.forEach((c) => drawConn(c));
      S.dots.forEach((p) => drawDot(p, t));

      S.raf = requestAnimationFrame(frame);
    }

    /* ── events ── */
    function onMouse(e: MouseEvent) {
      S.mx = e.clientX;
      S.my = e.clientY;
    }
    function onTouch(e: TouchEvent) {
      if (e.touches.length) {
        S.mx = e.touches[0].clientX;
        S.my = e.touches[0].clientY;
      }
    }

    /* ── boot ── */
    onResize();
    initDots();
    S.mx = S.w / 2;
    S.my = S.h / 2;

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (!prefersReduced.matches) {
      S.raf = requestAnimationFrame(frame);
    } else {
      S.hexes.forEach((h) => {
        h.curAlpha = CFG.baseAlpha;
        drawHex(h, 0);
      });
    }

    return () => {
      cancelAnimationFrame(S.raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -3,
        pointerEvents: "none",
      }}
    />
  );
}
