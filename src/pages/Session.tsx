import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SITE_NAME } from "@/config/site";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, FileVideo, FileAudio, FileText, File } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadFile {
  file: File;
  name: string;
  type: string;
  category: "video" | "audio" | "pdf" | "document" | "text" | "unknown";
}

function detectCategory(file: File): UploadFile["category"] {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type.startsWith("video/") || ["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
  if (file.type.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext) || file.type.includes("word")) return "document";
  if (["txt", "md", "markdown"].includes(ext) || file.type.startsWith("text/")) return "text";
  return "unknown";
}

const categoryIcon: Record<UploadFile["category"], React.ElementType> = {
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  document: FileText,
  text: File,
  unknown: File,
};

const categoryLabel: Record<UploadFile["category"], string> = {
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  document: "Document",
  text: "Text",
  unknown: "File",
};

const Session = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadFile[] = Array.from(fileList).map((f) => ({
      file: f,
      name: f.name,
      type: f.type,
      category: detectCategory(f),
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">{SITE_NAME}</h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Sigma drop zone */}
          <motion.div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            animate={dragging ? { scale: 1.08 } : { scale: 1 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="group relative mx-auto flex h-60 w-60 cursor-pointer items-center justify-center"
          >
            {/* Translucent bubble */}
            <div
              className={`absolute inset-0 rounded-full backdrop-blur-sm transition-all duration-300 ${
                dragging
                  ? "bg-primary/20 shadow-[0_8px_40px_hsl(var(--primary)/0.25),inset_0_-4px_12px_hsl(var(--primary)/0.1)]"
                  : "bg-primary/[0.08] shadow-[0_4px_20px_hsl(var(--primary)/0.08),inset_0_-2px_8px_hsl(var(--primary)/0.05)] group-hover:bg-primary/[0.12] group-hover:shadow-[0_6px_30px_hsl(var(--primary)/0.15),inset_0_-3px_10px_hsl(var(--primary)/0.08)]"
              }`}
            />
            {/* Glass highlight */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute top-2 left-6 right-6 h-[40%] rounded-full bg-gradient-to-b from-white/[0.15] to-transparent" />
            </div>

            <div className="relative flex flex-col items-center">
              <span
                className={`text-[7rem] font-bold leading-none transition-colors duration-200 ${
                  dragging ? "text-primary" : "text-primary/30 group-hover:text-primary/60"
                }`}
              >
                Σ
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                Drop files here
              </p>
            </div>
          </motion.div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Drag lecture videos, audio, PDFs, or notes to add context
          </p>

          {/* File collection */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 space-y-2"
              >
                {files.map((f, i) => {
                  const Icon = categoryIcon[f.category];
                  return (
                    <motion.div
                      key={`${f.name}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                        {categoryLabel[f.category]}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="px-10 py-6 text-base rounded-xl font-semibold w-full sm:w-auto"
              onClick={() => navigate("/workspace")}
            >
              Start Session
            </Button>
            {files.length === 0 && (
              <button
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                onClick={() => navigate("/workspace")}
              >
                Skip — start without uploads
              </button>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Session;
