const symbols = [
  "∫", "∑", "π", "∞", "√", "Δ", "∂", "∇", "∈", "∀", "λ", "θ",
  "♥", "±", "≈", "♥", "∮", "ℝ", "♥", "⊂", "∝", "♥", "ε", "φ",
  "σ", "♥", "Ω",
];

const positions = [
  { left: 8, top: 8 },
  { left: 22, top: 4 },
  { left: 38, top: 10 },
  { left: 55, top: 5 },
  { left: 72, top: 12 },
  { left: 88, top: 7 },
  { left: 14, top: 25 },
  { left: 45, top: 22 },
  { left: 65, top: 30 },
  { left: 85, top: 28 },
  { left: 6, top: 45 },
  { left: 30, top: 42 },
  { left: 50, top: 55 },
  { left: 78, top: 50 },
  { left: 18, top: 65 },
  { left: 92, top: 42 },
  { left: 5, top: 80 },
  { left: 42, top: 70 },
  { left: 70, top: 68 },
  { left: 90, top: 78 },
  { left: 28, top: 85 },
  { left: 58, top: 85 },
  { left: 35, top: 38 },
  { left: 82, top: 60 },
  { left: 48, top: 92 },
  { left: 75, top: 88 },
  { left: 15, top: 52 },
];

const MathSymbols = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {symbols.map((s, i) => (
        <span
          key={i}
          className={`absolute font-mono animate-float ${s === "♥" ? "text-primary/[0.10]" : "text-primary/[0.07]"}`}
          style={{
            fontSize: `${1.2 + ((i * 7) % 5) * 0.6}rem`,
            left: `${positions[i].left}%`,
            top: `${positions[i].top}%`,
            animationDelay: `${(i * 0.7) % 6}s`,
            animationDuration: `${5 + ((i * 3) % 5)}s`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
};

export default MathSymbols;
