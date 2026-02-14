import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SITE_NAME } from "@/config/site";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileVideo, BookOpen, X } from "lucide-react";
import { motion } from "framer-motion";

interface UploadFile {
  file: File;
  name: string;
  type: string;
}

const DropZone = ({
  label,
  icon: Icon,
  accept,
  description,
  file,
  onFile,
  onRemove,
}: {
  label: string;
  icon: React.ElementType;
  accept: string;
  description: string;
  file: UploadFile | null;
  onFile: (f: UploadFile) => void;
  onRemove: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile({ file: f, name: f.name, type: f.type });
    },
    [onFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile({ file: f, name: f.name, type: f.type });
  };

  if (file) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label} uploaded</p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`group cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
        dragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-card"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-muted-foreground/60">
        <span className="inline-flex items-center gap-1">
          <Upload className="h-3 w-3" /> Drag & drop or click to browse
        </span>
      </p>
    </div>
  );
};

const Session = () => {
  const navigate = useNavigate();
  const [video, setVideo] = useState<UploadFile | null>(null);
  const [textbook, setTextbook] = useState<UploadFile | null>(null);

  const canStart = video || textbook;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">{SITE_NAME}</h1>
        <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-mono text-primary">
          Customize Your TA
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">
              Customize your assistant
            </h2>
            <p className="mt-2 text-muted-foreground">
              Upload a lecture video or textbook to personalize your AI teaching assistant.
            </p>
          </div>

          <div className="space-y-5">
            <DropZone
              label="Lecture Video"
              icon={FileVideo}
              accept="video/*"
              description="Upload a lecture recording to reference during your session"
              file={video}
              onFile={setVideo}
              onRemove={() => setVideo(null)}
            />

            <DropZone
              label="Textbook or Notes"
              icon={BookOpen}
              accept=".pdf,.doc,.docx,.txt,.md"
              description="Upload a PDF, doc, or text file for context"
              file={textbook}
              onFile={setTextbook}
              onRemove={() => setTextbook(null)}
            />
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="px-10 py-6 text-base rounded-xl font-semibold w-full sm:w-auto"
              disabled={!canStart}
              onClick={() => navigate("/workspace")}
            >
              Start Session
            </Button>
            <button
              className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
              onClick={() => navigate("/workspace")}
            >
              Skip — start without uploads
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Session;
