const symbols = ["∫", "∑", "π", "∞", "√", "Δ", "∂", "∇", "∈", "∀", "λ", "θ"];

const MathSymbols = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {symbols.map((s, i) => (
        <span
          key={i}
          className="absolute font-mono text-primary/[0.07] animate-float"
          style={{
            fontSize: `${1.5 + Math.random() * 3}rem`,
            left: `${5 + (i / symbols.length) * 85}%`,
            top: `${10 + Math.random() * 75}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${5 + Math.random() * 4}s`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
};

export default MathSymbols;
