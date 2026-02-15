import { useEffect, useRef } from "react";

interface LovelaceToroidProps {
  className?: string;
  animate?: boolean;
  size?: number;

  /** Torus size controls */
  majorRadius?: number; // distance from center to tube center
  minorRadius?: number; // tube radius

  /** Heart deformation strength (0 = perfect torus) */
  heartness?: number;

  /** Visual density */
  rings?: number; // samples along u
  dotsPerRing?: number; // samples along v
}

const LovelaceToroid = ({
  className = "",
  animate = true,
  size = 600,
  majorRadius,
  minorRadius,
  heartness = 0.22,
  rings = 160,
  dotsPerRing = 70,
}: LovelaceToroidProps) => {
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

    // Important: reset transform each render so scaling doesn't accumulate
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = size;
    const h = size;
    const cx = w / 2;
    const cy = h / 2;

    const R = majorRadius ?? Math.min(w, h) * 0.24; // major radius
    const r0 = minorRadius ?? Math.min(w, h) * 0.105; // base tube radius

    // Perspective + styling
    const perspective = 760;

    startTimeRef.current = performance.now();

    const project = (x: number, y: number, z: number) => {
      const sc = perspective / (perspective + z);
      return { x: cx + x * sc, y: cy + y * sc, sc };
    };

    const rotateXYZ = (x: number, y: number, z: number, ax: number, ay: number, az: number) => {
      // rotate X
      let y1 = y * Math.cos(ax) - z * Math.sin(ax);
      let z1 = y * Math.sin(ax) + z * Math.cos(ax);
      let x1 = x;

      // rotate Y
      let x2 = x1 * Math.cos(ay) + z1 * Math.sin(ay);
      let z2 = -x1 * Math.sin(ay) + z1 * Math.cos(ay);
      let y2 = y1;

      // rotate Z
      let x3 = x2 * Math.cos(az) - y2 * Math.sin(az);
      let y3 = x2 * Math.sin(az) + y2 * Math.cos(az);
      let z3 = z2;

      return { x: x3, y: y3, z: z3 };
    };

    const draw = (timestamp: number) => {
      const t = (timestamp - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, w, h);

      // Subtle background vignette / glow-ish center (optional)
      // Keep it very light to match minimal UI
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.46, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.0)";
      ctx.fill();
      ctx.restore();

      // Rotation over time (tweak these for vibe)
      const ax = 0.9 + Math.sin(t * 0.23) * 0.08;
      const ay = t * 0.55;
      const az = 0.25 + Math.cos(t * 0.19) * 0.06;

      // We’ll draw back-to-front for nicer depth blending:
      // sample points, store with z, sort, then draw.
      const points: Array<{
        sx: number;
        sy: number;
        z: number;
        sc: number;
        depth01: number;
        localV: number;
      }> = [];

      // Heart deformation:
      // - make tube radius slightly larger near "top" of the torus (v ~ 0)
      // - pinch near "bottom" (v ~ pi)
      // - add a tiny vertical cusp via sin(2v) shaping
      //
      // v is angle around the tube cross-section.
      const deform = (v: number) => {
        // Range-ish [-1..1]
        const top = Math.cos(v); // 1 at top, -1 at bottom
        const cusp = Math.sin(2 * v); // adds slight pointiness
        // scale factor for tube radius
        const scale = 1 + heartness * (0.55 * top - 0.22 * (top * top) + 0.18 * cusp);
        // vertical shift to hint a heart indentation (very subtle)
        const yShift = heartness * r0 * (0.18 * Math.max(0, top) - 0.12 * Math.max(0, -top));
        return { scale, yShift };
      };

      for (let iu = 0; iu < rings; iu++) {
        const u = (iu / rings) * Math.PI * 2;

        // You can “twist” the tube a little along u for a more organic look
        const twist = 0.25 * Math.sin(u * 2 + t * 0.25) * heartness;

        for (let iv = 0; iv < dotsPerRing; iv++) {
          const v = (iv / dotsPerRing) * Math.PI * 2 + twist;

          const { scale, yShift } = deform(v);
          const r = r0 * scale;

          // Torus param:
          // x = (R + r cos v) cos u
          // y = (R + r cos v) sin u
          // z = r sin v
          //
          // We'll treat y as vertical on canvas, so swap axes a bit:
          const x = (R + r * Math.cos(v)) * Math.cos(u);
          const z = (R + r * Math.cos(v)) * Math.sin(u);
          let y = r * Math.sin(v) + yShift;

          // Slight heart “dip” near the top inner edge:
          // when v near 0 (top), pull inward a touch depending on u
          const topness = Math.max(0, Math.cos(v));
          const innerPull = heartness * topness * 0.12;
          const pullDir = -Math.cos(u); // pulls toward center from one side to make a “cleft” feel
          const x2 = x + pullDir * r0 * innerPull;

          const rot = rotateXYZ(x2, y, z, ax, ay, az);

          const { x: sx, y: sy, sc } = project(rot.x, rot.y, rot.z);

          // Normalize depth for style (approx bounds)
          const zMin = -(R + r0) * 1.3;
          const zMax = (R + r0) * 1.3;
          const depth01 = Math.min(1, Math.max(0, (rot.z - zMin) / (zMax - zMin)));

          points.push({ sx, sy, z: rot.z, sc, depth01, localV: v });
        }
      }

      // Sort back-to-front
      points.sort((a, b) => a.z - b.z);

      // Draw points
      for (const p of points) {
        // Dot sizing: smaller in back, larger in front
        const base = 0.65 + p.depth01 * 1.25;
        const rDot = Math.max(0.5, base * p.sc);

        // Opacity: more opaque in front
        const alpha = 0.10 + p.depth01 * 0.55;

        // Warm Lovelace-ish copper glow
        const lightness = 46 + p.depth01 * 18;

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rDot, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(15, 90%, ${lightness}%, ${alpha})`;
        ctx.fill();
      }

      // Optional: a few “orbit” strokes to hint structure (minimal)
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,120,80,0.14)";
      ctx.setLineDash([4, 9]);

      const strokeRings = 4;
      for (let k = 0; k < strokeRings; k++) {
        const uOff = t * 0.25 + k * 0.9;
        ctx.beginPath();
        let started = false;

        const steps = 220;
        for (let i = 0; i <= steps; i++) {
          const u = (i / steps) * Math.PI * 2 + uOff;
          const v = 0.15 + k * 0.45; // fixed tube angle for a “latitude” line

          const { scale, yShift } = deform(v);
          const r = r0 * scale;

          const x = (R + r * Math.cos(v)) * Math.cos(u);
          const z = (R + r * Math.cos(v)) * Math.sin(u);
          const y = r * Math.sin(v) + yShift;

          const rot = rotateXYZ(x, y, z, ax, ay, az);
          const pr = project(rot.x, rot.y, rot.z);

          if (!started) {
            ctx.moveTo(pr.x, pr.y);
            started = true;
          } else {
            ctx.lineTo(pr.x, pr.y);
          }
        }
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.restore();

      if (animate) animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationRef.current);
  }, [animate, size, majorRadius, minorRadius, heartness, rings, dotsPerRing]);

  return <canvas ref={canvasRef} className={className} style={{ width: size, height: size }} />;
};

export default LovelaceToroid;
