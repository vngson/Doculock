'use client';

import { useEffect, useRef, useState } from 'react';

interface FloatingElement {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  type: 'nextjs' | 'react' | 'typescript' | 'sui' | 'blockchain' | 'code' | 'hash';
}

const ELEMENTS: FloatingElement['type'][] = [
  'nextjs', 'react', 'typescript', 'sui', 'blockchain', 'code', 'hash'
];

// Reduced from 50 to 25 for better performance
const ELEMENT_COUNT = 25;
const FPS_THROTTLE = 2; // Throttle to 30fps for better performance

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elementsRef = useRef<FloatingElement[]>([]);
  const animationRef = useRef<number>();
  const lastFrameRef = useRef<number>(0);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit DPR for performance
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Don't animate for users who prefer reduced motion
      return () => window.removeEventListener('resize', resizeCanvas);
    }

    // Create random element
    const createRandomElement = (width: number, height: number): FloatingElement => {
      const type = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      const size = 25 + Math.random() * 50;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8, // Reduced speed
        vy: (Math.random() - 0.5) * 0.8,
        size,
        opacity: 0.08 + Math.random() * 0.12,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.015,
        type,
      };
    };

    // Initialize elements
    const initElements = () => {
      elementsRef.current = Array.from({ length: ELEMENT_COUNT }, () =>
        createRandomElement(window.innerWidth, window.innerHeight)
      );
    };

    initElements();

    // Draw element based on type
    const drawElement = (element: FloatingElement, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.translate(element.x, element.y);
      ctx.rotate(element.rotation);
      ctx.globalAlpha = element.opacity;

      const { type, size } = element;

      switch (type) {
        case 'nextjs':
          drawNextJS(ctx, size);
          break;
        case 'react':
          drawReact(ctx, size);
          break;
        case 'typescript':
          drawTypeScript(ctx, size);
          break;
        case 'sui':
          drawSui(ctx, size);
          break;
        case 'blockchain':
          drawBlockchain(ctx, size);
          break;
        case 'code':
          drawCode(ctx, size);
          break;
        case 'hash':
          drawHash(ctx, size);
          break;
      }

      ctx.restore();
    };

    // Draw Next.js logo (triangle)
    const drawNextJS = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 2, size / 2);
      ctx.lineTo(-size / 2, size / 2);
      ctx.closePath();
      ctx.fill();
    };

    // Draw React logo (atom)
    const drawReact = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.strokeStyle = '#61DAFB';
      ctx.lineWidth = 2;

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, size / 2, size / 4, (i * Math.PI * 2) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#61DAFB';
      ctx.beginPath();
      ctx.arc(0, 0, size / 8, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw TypeScript logo
    const drawTypeScript = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.fillStyle = '#3178C6';
      ctx.font = `bold ${size}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TS', 0, 0);
    };

    // Draw Sui logo
    const drawSui = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.fillStyle = '#4DA2FF';
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 2, 0);
      ctx.lineTo(0, size / 2);
      ctx.lineTo(-size / 2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const x = Math.cos(angle) * (size / 4);
        const y = Math.sin(angle) * (size / 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };

    // Draw blockchain nodes
    const drawBlockchain = (ctx: CanvasRenderingContext2D, size: number) => {
      const nodeSize = size / 5;
      ctx.fillStyle = '#00C9A7';

      const nodes = [
        { x: 0, y: -size / 2 },
        { x: size / 2, y: 0 },
        { x: 0, y: size / 2 },
        { x: -size / 2, y: 0 },
      ];

      ctx.strokeStyle = '#00C9A7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(nodes[1].x, nodes[1].y);
      ctx.lineTo(nodes[2].x, nodes[2].y);
      ctx.lineTo(nodes[3].x, nodes[3].y);
      ctx.closePath();
      ctx.stroke();

      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Draw code symbols
    const drawCode = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.strokeStyle = '#A78BFA';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(-size / 3, -size / 4);
      ctx.lineTo(-size / 2, 0);
      ctx.lineTo(-size / 3, size / 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(size / 3, -size / 4);
      ctx.lineTo(size / 2, 0);
      ctx.lineTo(size / 3, size / 4);
      ctx.stroke();
    };

    // Draw hash symbol
    const drawHash = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-size / 4, -size / 2);
      ctx.lineTo(-size / 4, size / 2);
      ctx.moveTo(size / 4, -size / 2);
      ctx.lineTo(size / 4, size / 2);
      ctx.moveTo(-size / 2, -size / 4);
      ctx.lineTo(size / 2, -size / 4);
      ctx.moveTo(-size / 2, size / 4);
      ctx.lineTo(size / 2, size / 4);
      ctx.stroke();
    };

    // Animation loop with throttling
    const animate = (timestamp: number) => {
      if (!isVisibleRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Throttle frame rate for better performance
      const elapsed = timestamp - lastFrameRef.current;
      if (elapsed < 1000 / (60 / FPS_THROTTLE)) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameRef.current = timestamp;

      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      elementsRef.current.forEach(element => {
        element.x += element.vx;
        element.y += element.vy;
        element.rotation += element.rotationSpeed;

        if (element.x > width + element.size) element.x = -element.size;
        if (element.x < -element.size) element.x = width + element.size;
        if (element.y > height + element.size) element.y = -element.size;
        if (element.y < -element.size) element.y = height + element.size;

        drawElement(element, ctx);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Intersection Observer to pause when not visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
        opacity: 0.85,
      }}
      aria-hidden="true"
    />
  );
}
