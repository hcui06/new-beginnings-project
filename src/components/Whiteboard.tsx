import { useState, useRef, useCallback } from "react";
import { Pencil, Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhiteboardProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  className?: string;
}

const COLORS = [
  { name: "Black", value: "hsl(0, 0%, 5%)" },
  { name: "Red", value: "hsl(0, 80%, 50%)" },
  { name: "Blue", value: "hsl(220, 80%, 50%)" },
  { name: "Orange", value: "hsl(25, 90%, 52%)" },
  { name: "Green", value: "hsl(140, 60%, 40%)" },
];

const Whiteboard = ({ canvasRef, className = "" }: WhiteboardProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");

  const fillCanvasWhite = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, [canvasRef]);

  // Initialize white bg
  const initialized = useRef(false);
  if (canvasRef.current && !initialized.current) {
    fillCanvasWhite();
    initialized.current = true;
  }

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const t = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
      if (!t) return { x: 0, y: 0 };
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = tool === "eraser" ? "white" : color;
    ctx.lineWidth = tool === "eraser" ? 24 : 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e?.preventDefault) e.preventDefault();
    setIsDrawing(false);
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fillCanvasWhite();
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-1.5 mr-2">
          {COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => { setColor(c.value); setTool("brush"); }}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c.value,
                borderColor: color === c.value && tool === "brush" ? "hsl(25, 90%, 52%)" : "transparent",
                transform: color === c.value && tool === "brush" ? "scale(1.15)" : undefined,
              }}
              aria-label={c.name}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        <Button
          variant={tool === "brush" ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setTool("brush")}
        >
          <Pencil className="h-4 w-4" />
        </Button>

        <Button
          variant={tool === "eraser" ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setTool("eraser")}
        >
          <Eraser className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={clearBoard}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-white rounded-b-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>
    </div>
  );
};

export default Whiteboard;
