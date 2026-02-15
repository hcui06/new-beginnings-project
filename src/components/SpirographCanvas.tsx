import { useEffect, useRef } from "react";

interface SpirographCanvasProps {
  className?: string;
  animate?: boolean;
  size?: number;
}

const SpirographCanvas = ({ className = "", animate = true, size = 600 }: SpirographCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    startTimeRef.current = performance.now();

    const w = size;
    const h = size;
    const cx = w / 2;
    const cy = h / 2;
    const perspective = 800;
    const heartScale = Math.min(w, h) * 0.013;

    // Heart curve parametric: x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
    const heart = (t: number) => {
      const sinT = Math.sin(t);
      const x = 16 * sinT * sinT * sinT;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return { x, y };
    };

    const rotateXYZ = (x: number, y: number, z: number, ax: number, ay: number) => {
      const y1 = y * Math.cos(ax) - z * Math.sin(ax);
      const z1 = y * Math.sin(ax) + z * Math.cos(ax);
      const x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
      const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
      return { x: x2, y: y1, z: z2 };
    };

    const project = (x: number, y: number, z: number) => {
      const sc = perspective / (perspective + z);
      return { x: cx + x * sc, y: cy + y * sc, sc };
    };

    // Define ring planes — evenly distributed tilts for a globe-like structure
    const rings = [
      { tiltX: 0, tiltY: 0, phase: 0 },
      { tiltX: 0.52, tiltY: 0.15, phase: 0.4 },
      { tiltX: -0.48, tiltY: 0.5, phase: 0.8 },
      { tiltX: 0.25, tiltY: -0.55, phase: 1.2 },
      { tiltX: -0.15, tiltY: -0.4, phase: 1.6 },
      { tiltX: 0.7, tiltY: 0.3, phase: 2.0 },
      { tiltX: -0.6, tiltY: 0.1, phase: 2.4 },
      { tiltX: 0.1, tiltY: 0.7, phase: 2.8 },
      { tiltX: 1.1, tiltY: 0.15, phase: 3.2 },
      { tiltX: 0.15, tiltY: 1.1, phase: 3.6 },
      { tiltX: -0.35, tiltY: 0.65, phase: 4.0 },
      { tiltX: 0.55, tiltY: -0.35, phase: 4.4 },
    ];

    const draw = (timestamp: number) => {
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      ctx.clearRect(0, 0, w, h);

      // Slow global rotation
      const globalY = elapsed * 0.12;

      for (let r = 0; r < rings.length; r++) {
        const ring = rings[r];
        const dotsPerRing = 120;

        // Gentle drift on tilt
        const tx = ring.tiltX + Math.sin(elapsed * 0.08 + ring.phase) * 0.06;
        const ty = ring.tiltY + globalY;

        // Collect dots with depth for sorting
        const dots: { sx: number; sy: number; z: number; depth01: number }[] = [];

        let zMin = Infinity;
        let zMax = -Infinity;

        for (let d = 0; d < dotsPerRing; d++) {
          const t = (d / dotsPerRing) * Math.PI * 2;
          const h2d = heart(t);

          const hx = h2d.x * heartScale;
          const hy = h2d.y * heartScale;
          const hz = 0; // heart is flat, rotation gives 3D

          const rot = rotateXYZ(hx, hy, hz, tx, ty);
          zMin = Math.min(zMin, rot.z);
          zMax = Math.max(zMax, rot.z);

          const pr = project(rot.x, rot.y, rot.z);
          dots.push({ sx: pr.x, sy: pr.y, z: rot.z, depth01: 0 });
        }

        const zRange = Math.max(1e-6, zMax - zMin);
        for (const dot of dots) {
          dot.depth01 = (dot.z - zMin) / zRange;
        }

        // Draw connecting lines (heart outline)
        for (let d = 0; d < dots.length; d++) {
          const a = dots[d];
          const b = dots[(d + 1) % dots.length];
          const depth = (a.depth01 + b.depth01) * 0.5;
          const alpha = 0.08 + depth * 0.32;
          const light = 44 + depth * 22;

          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.strokeStyle = `hsla(280, 30%, ${light}%, ${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }

        // Draw dots on top
        for (const dot of dots) {
          const dotSize = 0.6 + dot.depth01 * 1.2;
          const alpha = 0.15 + dot.depth01 * 0.5;
          const light = 46 + dot.depth01 * 18;

          ctx.beginPath();
          ctx.arc(dot.sx, dot.sy, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(280, 30%, ${light}%, ${alpha})`;
          ctx.fill();
        }
      }

      if (animate) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationRef.current);
  }, [animate, size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export default SpirographCanvas;
