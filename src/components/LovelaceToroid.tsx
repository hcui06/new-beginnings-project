import { useEffect, useRef } from "react";

interface LovelaceToroidProps {
  className?: string;
  animate?: boolean;
  size?: number;
  tSteps?: number;
  uSteps?: number;
}

const LovelaceToroid = ({
  className = "",
  animate = true,
  size = 600,
  tSteps = 160,
  uSteps = 90,
}: LovelaceToroidProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = size;
    const h = size;
    const cx = w / 2;
    const cy = h / 2;

    const perspective = 900;
    const scale = size * 0.07;

    const project = (x: number, y: number, z: number) => {
      const sc = perspective / (perspective + z);
      return { x: cx + x * sc, y: cy + y * sc, sc };
    };

    const rotateXYZ = (x: number, y: number, z: number, ax: number, ay: number) => {
      const y1 = y * Math.cos(ax) - z * Math.sin(ax);
      const z1 = y * Math.sin(ax) + z * Math.cos(ax);

      const x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
      const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);

      return { x: x2, y: y1, z: z2 };
    };

    const draw = (ts: number) => {
      const time = (ts - startRef.current) / 1000;
      ctx.clearRect(0, 0, w, h);

      const ax = 0.6 + Math.sin(time * 0.2) * 0.2;
      const ay = time * 0.35;

      const points: Array<{ z: number; draw: () => void }> = [];

      for (let i = 0; i < tSteps; i++) {
        const t = (i / tSteps) * Math.PI * 2;

        for (let j = 0; j < uSteps; j++) {
          const u = (j / uSteps) * Math.PI * 2;

          let x = 3 + Math.sin(t) + Math.cos(u);
          let y = 2 * (t - Math.PI);
          let z = Math.sin(u) + 2 * Math.cos(t);

          x *= scale;
          y *= scale * 0.7;
          z *= scale;

          const rot = rotateXYZ(x, y, z, ax, ay);
          const pr = project(rot.x, rot.y, rot.z);

          const depth = (rot.z + 200) / 400;
          const alpha = 0.15 + depth * 0.6;
          const light = 45 + depth * 25;
          const rDot = Math.max(0.6, (0.8 + depth * 1.4) * pr.sc);

          points.push({
            z: rot.z,
            draw: () => {
              ctx.beginPath();
              ctx.arc(pr.x, pr.y, rDot, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(280, 30%, ${light}%, ${alpha})`;
              ctx.fill();
            },
          });
        }
      }

      points.sort((a, b) => a.z - b.z);
      for (const p of points) p.draw();

      if (animate) rafRef.current = requestAnimationFrame(draw);
    };

    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(rafRef.current);
  }, [animate, size, tSteps, uSteps]);

  return <canvas ref={canvasRef} className={className} style={{ width: size, height: size }} />;
};

export default LovelaceToroid;
