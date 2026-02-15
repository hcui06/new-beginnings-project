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
  tSteps = 140,
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
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = size;
    const h = size;
    const cx = w / 2;
    const cy = h / 2;

    const perspective = 950;

    const project = (x: number, y: number, z: number) => {
      const sc = perspective / (perspective + z);
      return { x: cx + x * sc, y: cy + y * sc, sc };
    };

    const rotateXYZ = (x: number, y: number, z: number, ax: number, ay: number, az: number) => {
      let y1 = y * Math.cos(ax) - z * Math.sin(ax);
      let z1 = y * Math.sin(ax) + z * Math.cos(ax);
      let x1 = x;

      let x2 = x1 * Math.cos(ay) + z1 * Math.sin(ay);
      let z2 = -x1 * Math.sin(ay) + z1 * Math.cos(ay);
      let y2 = y1;

      let x3 = x2 * Math.cos(az) - y2 * Math.sin(az);
      let y3 = x2 * Math.sin(az) + y2 * Math.cos(az);

      return { x: x3, y: y3, z: z2 };
    };

    const surface = (t: number, u: number) => {
      const x = 3 + Math.sin(t) + Math.cos(u);
      const y = 2 * t;
      const z = Math.sin(u) + 2 * Math.cos(t);
      return { x, y, z };
    };

    const scaleX = size * 0.08;
    const scaleY = size * 0.025;
    const scaleZ = size * 0.08;

    const draw = (ts: number) => {
      const time = (ts - startRef.current) / 1000;
      ctx.clearRect(0, 0, w, h);

      const ax = 0.9 + Math.sin(time * 0.22) * 0.12;
      const ay = time * 0.35;
      const az = 0.35 + Math.cos(time * 0.18) * 0.08;

      const grid: { sx: number; sy: number; z: number; depth01: number }[][] = [];
      const yCenter = 2 * Math.PI;

      let zMin = Infinity;
      let zMax = -Infinity;

      for (let i = 0; i < tSteps; i++) {
        const t = (i / (tSteps - 1)) * Math.PI * 2;
        const row = [];
        for (let j = 0; j < uSteps; j++) {
          const u = (j / uSteps) * Math.PI * 2;
          const p = surface(t, u);

          const x = p.x * scaleX;
          const y = (p.y - yCenter) * scaleY;
          const z = p.z * scaleZ;

          const rot = rotateXYZ(x, y, z, ax, ay, az);
          zMin = Math.min(zMin, rot.z);
          zMax = Math.max(zMax, rot.z);

          const pr = project(rot.x, rot.y, rot.z);
          row.push({ sx: pr.x, sy: pr.y, z: rot.z, depth01: 0 });
        }
        grid.push(row);
      }

      const zRange = Math.max(1e-6, zMax - zMin);
      for (let i = 0; i < tSteps; i++) {
        for (let j = 0; j < uSteps; j++) {
          grid[i][j].depth01 = (grid[i][j].z - zMin) / zRange;
        }
      }

      const segs: Array<{ z: number; draw: () => void }> = [];

      // u-direction lines (wrap)
      for (let i = 0; i < tSteps; i++) {
        for (let j = 0; j < uSteps; j++) {
          const a = grid[i][j];
          const b = grid[i][(j + 1) % uSteps];
          const depth = (a.depth01 + b.depth01) * 0.5;
          const alpha = 0.06 + depth * 0.22;
          const light = 44 + depth * 22;

          segs.push({
            z: (a.z + b.z) * 0.5,
            draw: () => {
              ctx.beginPath();
              ctx.moveTo(a.sx, a.sy);
              ctx.lineTo(b.sx, b.sy);
              ctx.strokeStyle = `hsla(280, 30%, ${light}%, ${alpha})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            },
          });
        }
      }

      // t-direction lines (no wrap)
      for (let i = 0; i < tSteps - 1; i++) {
        for (let j = 0; j < uSteps; j++) {
          const a = grid[i][j];
          const b = grid[i + 1][j];
          const depth = (a.depth01 + b.depth01) * 0.5;
          const alpha = 0.05 + depth * 0.18;
          const light = 42 + depth * 20;

          segs.push({
            z: (a.z + b.z) * 0.5,
            draw: () => {
              ctx.beginPath();
              ctx.moveTo(a.sx, a.sy);
              ctx.lineTo(b.sx, b.sy);
              ctx.strokeStyle = `hsla(280, 28%, ${light}%, ${alpha})`;
              ctx.lineWidth = 0.9;
              ctx.stroke();
            },
          });
        }
      }

      segs.sort((a, b) => a.z - b.z);
      for (const s of segs) s.draw();

      // sparkly highlight points
      for (let i = 0; i < tSteps; i += 6) {
        for (let j = 0; j < uSteps; j += 6) {
          const p = grid[i][j];
          const d = p.depth01;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 0.7 + d * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(275, 35%, ${52 + d * 18}%, ${0.10 + d * 0.35})`;
          ctx.fill();
        }
      }

      if (animate) rafRef.current = requestAnimationFrame(draw);
    };

    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(rafRef.current);
  }, [animate, size, tSteps, uSteps]);

  return <canvas ref={canvasRef} className={className} style={{ width: size, height: size }} />;
};

export default LovelaceToroid;
