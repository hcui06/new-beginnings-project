const symbols = [
  "∫", "∑", "π", "∞", "√", "Δ", "∂", "∇", "∈", "∀", "λ", "θ",
  "♥", "±", "≈", "♥", "∮", "ℝ", "♥", "⊂", "∝", "♥", "ε", "φ",
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
            left: `${3 + ((i * 37) % 90)}%`,
            top: `${5 + ((i * 53) % 85)}%`,
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
