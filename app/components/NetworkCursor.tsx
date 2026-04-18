"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  type: 'particle' | 'cursor';
  life: number;
}

interface Connection {
  a: number;
  b: number;
  alpha: number;
}

const CONFIG = {
  particleCount: 20, // Reduced from 30 to 20
  cursorRadius: 150,
  connectionDist: 100,
  particleSpeed: 0.6, // Reduced from 0.8
  cursorNodeCount: 6, // Reduced from 8
  minAlpha: 0.1,
  maxAlpha: 0.6,
};

export function NetworkCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    w: number;
    h: number;
    mx: number;
    my: number;
    nodes: Node[];
    connections: Connection[];
    raf: number;
    lastX: number;
    lastY: number;
    trail: Array<{ x: number; y: number; alpha: number }>;
    lastFrame: number;
    isVisible: boolean;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const S = {
      w: 0,
      h: 0,
      mx: window.innerWidth / 2,
      my: window.innerHeight / 2,
      nodes: [] as Node[],
      connections: [] as Connection[],
      raf: 0,
      lastX: window.innerWidth / 2,
      lastY: window.innerHeight / 2,
      trail: [] as Array<{ x: number; y: number; alpha: number }>,
      lastFrame: 0,
      isVisible: true,
    };
    stateRef.current = S;

    function resize() {
      S.w = window.innerWidth;
      S.h = window.innerHeight;
      canvas.width = S.w;
      canvas.height = S.h;
    }

    function initParticles() {
      S.nodes = [];
      for (let i = 0; i < CONFIG.particleCount; i++) {
        S.nodes.push({
          x: Math.random() * S.w,
          y: Math.random() * S.h,
          vx: (Math.random() - 0.5) * CONFIG.particleSpeed,
          vy: (Math.random() - 0.5) * CONFIG.particleSpeed,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.3 + 0.1,
          type: 'particle',
          life: 1,
        });
      }
    }

    function addCursorNode() {
      if (S.trail.length < CONFIG.cursorNodeCount) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 30 + 20;
        S.nodes.push({
          x: S.mx + Math.cos(angle) * dist,
          y: S.my + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 2.5 + 1.5,
          alpha: 0.8,
          type: 'cursor',
          life: 1,
        });
      }
    }

    function updateNodes() {
      // Update trail
      const speed = Math.sqrt(
        Math.pow(S.mx - S.lastX, 2) + Math.pow(S.my - S.lastY, 2)
      );

      if (speed > 5) {
        S.trail.push({ x: S.mx, y: S.my, alpha: 0.5 });
        if (S.trail.length > 15) S.trail.shift(); // Reduced from 20 to 15
      }

      // Fade trail
      S.trail.forEach(t => t.alpha *= 0.95);
      S.trail = S.trail.filter(t => t.alpha > 0.01);

      // Add cursor nodes periodically
      if (Math.random() < 0.08) { // Reduced from 0.1 to 0.08
        addCursorNode();
      }

      // Update all nodes
      for (let i = S.nodes.length - 1; i >= 0; i--) {
        const node = S.nodes[i];

        if (node.type === 'cursor') {
          const dx = S.mx - node.x;
          const dy = S.my - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 50) {
            node.vx += (dx / dist) * 0.1;
            node.vy += (dy / dist) * 0.1;
          }

          node.life -= 0.005;
          node.alpha = node.life * 0.8;
        } else {
          const dx = S.mx - node.x;
          const dy = S.my - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONFIG.cursorRadius) {
            const force = (1 - dist / CONFIG.cursorRadius) * 0.05;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }

          node.vx += (Math.random() - 0.5) * 0.1;
          node.vy += (Math.random() - 0.5) * 0.1;
        }

        // Limit speed
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > 2) {
          node.vx = (node.vx / speed) * 2;
          node.vy = (node.vy / speed) * 2;
        }

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > S.w) node.vx *= -1;
        if (node.y < 0 || node.y > S.h) node.vy *= -1;

        if (node.type === 'cursor' && node.life <= 0) {
          S.nodes.splice(i, 1);
        }
      }

      // Calculate connections
      S.connections = [];
      for (let i = 0; i < S.nodes.length; i++) {
        for (let j = i + 1; j < S.nodes.length; j++) {
          const dx = S.nodes[j].x - S.nodes[i].x;
          const dy = S.nodes[j].y - S.nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONFIG.connectionDist) {
            const alpha = (1 - dist / CONFIG.connectionDist) *
                          Math.min(S.nodes[i].alpha, S.nodes[j].alpha);
            if (alpha > 0.01) {
              S.connections.push({ a: i, b: j, alpha });
            }
          }
        }
      }

      S.lastX = S.mx;
      S.lastY = S.my;
    }

    function draw() {
      ctx.clearRect(0, 0, S.w, S.h);

      // Draw trail
      S.trail.forEach((t, i) => {
        const next = S.trail[i + 1];
        if (next) {
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(next.x, next.y);
          ctx.strokeStyle = `rgba(0, 192, 255, ${t.alpha * 0.3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 192, 255, ${t.alpha * 0.5})`;
        ctx.fill();
      });

      // Draw connections
      S.connections.forEach(conn => {
        const a = S.nodes[conn.a];
        const b = S.nodes[conn.b];

        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        gradient.addColorStop(0, `rgba(0, 192, 255, ${conn.alpha})`);
        gradient.addColorStop(1, `rgba(188, 140, 255, ${conn.alpha})`);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw nodes
      S.nodes.forEach(node => {
        const glowSize = node.type === 'cursor' ? node.size * 3 : node.size * 2;
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, glowSize
        );
        const color = node.type === 'cursor' ? '188, 140, 255' : '0, 192, 255';
        gradient.addColorStop(0, `rgba(${color}, ${node.alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);

        ctx.beginPath();
        ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.type === 'cursor'
          ? `rgba(188, 140, 255, ${node.alpha})`
          : `rgba(0, 192, 255, ${node.alpha})`;
        ctx.fill();
      });

      // Draw cursor glow
      const cursorGradient = ctx.createRadialGradient(
        S.mx, S.my, 0,
        S.mx, S.my, CONFIG.cursorRadius
      );
      cursorGradient.addColorStop(0, 'rgba(0, 192, 255, 0.1)');
      cursorGradient.addColorStop(0.5, 'rgba(188, 140, 255, 0.05)');
      cursorGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = cursorGradient;
      ctx.fillRect(0, 0, S.w, S.h);
    }

    // Throttled animation at 30fps
    const FPS_THROTTLE = 2;
    function animate(timestamp: number) {
      if (!S.isVisible) {
        S.raf = requestAnimationFrame(animate);
        return;
      }

      const elapsed = timestamp - S.lastFrame;
      if (elapsed < 1000 / (60 / FPS_THROTTLE)) {
        S.raf = requestAnimationFrame(animate);
        return;
      }
      S.lastFrame = timestamp;

      updateNodes();
      draw();
      S.raf = requestAnimationFrame(animate);
    }

    function onMouseMove(e: MouseEvent) {
      S.mx = e.clientX;
      S.my = e.clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length) {
        S.mx = e.touches[0].clientX;
        S.my = e.touches[0].clientY;
      }
    }

    resize();
    initParticles();

    // Intersection Observer to pause when not visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          S.isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    S.raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(S.raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
