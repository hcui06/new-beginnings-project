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
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    startTimeRef.current = performance.now();

    const draw = (timestamp: number) => {
      const w = size;
      const h = size;
      const cx = w / 2;
      const cy = h / 2;
      const elapsed = (timestamp - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, w, h);

      const maxRadius = Math.min(w, h) * 0.46;
      const perspective = 700;

      // Multiple orbital planes at different tilts — like a wireframe globe
      const planes = [
        // Face-on rings
        { tiltX: 0, tiltY: 0, speed: 1 },
        // Tilted rings creating sphere-like form
        { tiltX: 0.5, tiltY: 0.15, speed: -0.7 },
        { tiltX: -0.45, tiltY: 0.5, speed: 0.8 },
        { tiltX: 0.25, tiltY: -0.55, speed: -0.9 },
        { tiltX: -0.15, tiltY: -0.4, speed: 0.6 },
        { tiltX: 0.6, tiltY: 0.3, speed: -0.5 },
        { tiltX: -0.55, tiltY: -0.1, speed: 0.75 },
        { tiltX: 0.1, tiltY: 0.65, speed: -0.65 },
        { tiltX: 0.7, tiltY: -0.2, speed: 0.55 },
        { tiltX: -0.3, tiltY: 0.7, speed: -0.85 },
        { tiltX: 0.35, tiltY: 0.45, speed: 0.4 },
        { tiltX: -0.6, tiltY: 0.35, speed: -0.6 },
        // Near-perpendicular planes
        { tiltX: 1.2, tiltY: 0.1, speed: 0.3 },
        { tiltX: 0.1, tiltY: 1.2, speed: -0.35 },
        { tiltX: -0.8, tiltY: 0.6, speed: 0.45 },
      ];

      const ringsPerPlane = [3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1];

      for (let p = 0; p < planes.length; p++) {
        const plane = planes[p];
        const numRings = ringsPerPlane[p] || 1;

        for (let ri = 0; ri < numRings; ri++) {
          const radiusFraction = 0.35 + (ri / numRings) * 0.65 + (p * 0.04);
          const radius = maxRadius * Math.min(radiusFraction, 1.0);
          const dotCount = 60 + p * 8 + ri * 20;
          const rotation = elapsed * 0.35 * plane.speed + p * 0.7 + ri * 0.5;

          const tx = plane.tiltX + elapsed * 0.02 * (p % 2 === 0 ? 1 : -1);
          const ty = plane.tiltY + elapsed * 0.015 * (p % 2 === 0 ? -1 : 1);
          const cosTX = Math.cos(tx);
          const sinTX = Math.sin(tx);
          const cosTY = Math.cos(ty);
          const sinTY = Math.sin(ty);

          // Draw dots
          for (let d = 0; d < dotCount; d++) {
            const angle = (d / dotCount) * Math.PI * 2 + rotation;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;

            // 3D rotation
            const y1 = py * cosTX;
            const z1 = py * sinTX;
            const x2 = px * cosTY + z1 * sinTY;
            const z2 = -px * sinTY + z1 * cosTY;

            const sc = perspective / (perspective + z2);
            const sx = cx + x2 * sc;
            const sy = cy + y1 * sc;

            const depth = (z2 + maxRadius) / (2 * maxRadius);
            const dotSize = (1.2 + ri * 0.4) * (0.5 + depth * 0.7) * sc;
            const opacity = (0.35 + depth * 0.65) * (p < 4 ? 0.9 : 0.7);

            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(dotSize, 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(25, 90%, ${46 + depth * 16}%, ${opacity})`;
            ctx.fill();
          }

          // Arc segments on primary planes
          if (p < 8 && ri === 0) {
            const arcDots = 80;
            const arcStart = rotation + p * 0.8;
            const arcLen = Math.PI * (0.4 + Math.sin(elapsed * 0.25 + p) * 0.35);

            ctx.beginPath();
            for (let a = 0; a <= arcDots; a++) {
              const angle = arcStart + (a / arcDots) * arcLen;
              const px = Math.cos(angle) * radius;
              const py = Math.sin(angle) * radius;
              const y1 = py * cosTX;
              const z1 = py * sinTX;
              const x2 = px * cosTY + z1 * sinTY;
              const z2 = -px * sinTY + z1 * cosTY;
              const sc2 = perspective / (perspective + z2);
              const sx = cx + x2 * sc2;
              const sy = cy + y1 * sc2;
              if (a === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            const depth2 = p < 4 ? 0.5 : 0.3;
            ctx.strokeStyle = `hsla(25, 85%, 55%, ${depth2})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      // Radial spokes from center
      const spokeCount = 12;
      for (let s = 0; s < spokeCount; s++) {
        const angle = (s / spokeCount) * Math.PI * 2 + elapsed * 0.015;
        const len = maxRadius * (0.85 + Math.sin(elapsed * 0.15 + s * 0.8) * 0.15);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.strokeStyle = `hsla(25, 90%, 52%, 0.07)`;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Horizontal scan lines
      for (let i = 0; i < 8; i++) {
        const y = cy + Math.sin(elapsed * 0.25 + i * 0.9) * maxRadius * 0.7;
        const xOff = maxRadius * 0.4 + i * maxRadius * 0.07;
        ctx.beginPath();
        ctx.moveTo(cx - xOff - maxRadius * 0.55, y);
        ctx.lineTo(cx - xOff, y);
        ctx.strokeStyle = `hsla(25, 90%, 52%, 0.12)`;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 6]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + xOff, y);
        ctx.lineTo(cx + xOff + maxRadius * 0.55, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Central crosshair
      const lineLen = maxRadius * 1.15;
      ctx.beginPath();
      ctx.moveTo(cx, cy - lineLen);
      ctx.lineTo(cx, cy + lineLen);
      ctx.strokeStyle = `hsla(25, 90%, 52%, 0.1)`;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - lineLen, cy);
      ctx.lineTo(cx + lineLen, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center concentric circles
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 3 + c * 6, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(25, 90%, 55%, ${0.25 - c * 0.05})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      if (animate) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
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
