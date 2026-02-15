import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SITE_NAME } from "@/config/site";
import { Button } from "@/components/ui/button";
import Whiteboard from "@/components/Whiteboard";
import LovelaceToroid from "@/components/LovelaceToroid";
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const Workspace = () => {
  const navigate = useNavigate();

  // ===== realtime state =====
  const [status, setStatus] = useState("Ready to start");
  const [subtitles, setSubtitles] = useState("");
  const [log, setLog] = useState("");
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [talking, setTalking] = useState(false);
  const [inputMode, setInputMode] = useState<"audio" | "text">("audio");
  const [textInput, setTextInput] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const turnTranscriptRef = useRef("");
  const lastSnapshotRef = useRef<string | null>(null);

  // ===== whiteboard =====
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function appendLog(s: string) {
    setLog((prev) => prev + s + "\n");
  }

  function sendEvent(evt: Record<string, unknown>) {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(evt));
  }

  function showUserTranscript(text: string) {
    if (!text) return;
    appendLog("YOU: " + text);
    setUserTranscript(text);
    setTimeout(() => setUserTranscript(""), 4000);
  }

  async function start() {
    setStatus("Requesting microphone…");

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = micStream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = new Audio();
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const [track] = micStream.getAudioTracks();
      pc.addTrack(track, micStream);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      // turnTranscript now uses ref

      dc.onopen = () => {
        setStarted(true);
        setStatus("Connected — press Talk");

        sendEvent({
          type: "session.update",
          session: {
            input_audio_transcription: { model: "gpt-4o-transcribe", language: "en" },
            modalities: ["text", "audio"],
            turn_detection: null,
            voice: "ash",
          },
        });
      };

      dc.onmessage = (e) => {
        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(e.data);
        } catch {
          return;
        }

        // Debug: log all event types
        // appendLog("EVT: " + (evt.type as string));

        if (evt.type === "conversation.item.input_audio_transcription.delta") {
          turnTranscriptRef.current += (evt.delta as string) || "";
          return;
        }

        if (evt.type === "conversation.item.input_audio_transcription.completed") {
          const finalText = ((evt.transcript as string) || turnTranscriptRef.current || "").trim();
          showUserTranscript(finalText);
          turnTranscriptRef.current = "";

          // ✅ PIPELINE HOOK: `finalText` contains the user's transcribed speech.
          // Use it here to send to other parts of the pipeline, e.g.:
          //   sendToPipeline({ transcript: finalText, whiteboardSnapshot: lastSnapshotRef.current });
          return;
        }

        if (evt.type === "response.audio_transcript.delta" && evt.delta) {
          setSubtitles((prev) => prev + (evt.delta as string));
          return;
        }

        if (evt.type === "response.audio_transcript.done") {
          setStatus("Connected — press Talk");
          setTimeout(() => setSubtitles(""), 1200);
          return;
        }

        if (evt.type === "conversation.item.input_audio_transcription.failed") {
          appendLog("TRANSCRIPTION FAILED: " + JSON.stringify(evt));
          return;
        }

        // if (evt.type === "error") {
        //   appendLog("ERROR: " + JSON.stringify(evt));
        // }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setStatus("Connecting…");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const r = await fetch(`${supabaseUrl}/functions/v1/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          apikey: supabaseKey,
        },
        body: offer.sdp,
      });
      if (!r.ok) throw new Error(await r.text());

      const answerSdp = await r.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setStatus("Connected — press Talk");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  function toggleMute() {
    const stream = micStreamRef.current;
    if (!stream) return;
    const next = !muted;
    setMuted(next);
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setStatus(next ? "Muted" : "Ready — press Talk");
  }

  /** Capture the whiteboard as a JPEG data URL */
  function captureWhiteboard(): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  function toggleTalking() {
    if (!talking) {
      setTalking(true);
      setStatus("Listening…");
      turnTranscriptRef.current = "";
      sendEvent({ type: "input_audio_buffer.clear" });
    } else {
      setTalking(false);
      setStatus("Processing…");

      // Capture whiteboard snapshot when user stops talking
      const snapshot = captureWhiteboard();
      lastSnapshotRef.current = snapshot;

      // ✅ PIPELINE HOOK: `snapshot` is a JPEG data URL of the whiteboard.
      // Use it here alongside the transcript to send to other pipeline stages, e.g.:
      //   sendToPipeline({ whiteboardSnapshot: snapshot });

      sendEvent({ type: "input_audio_buffer.commit" });
      sendEvent({ type: "response.create" });
    }
  }

  function sendTextMessage() {
    const text = textInput.trim();
    if (!text) return;
    showUserTranscript(text);
    setTextInput("");

    // ✅ PIPELINE HOOK: `text` is the user's typed message.
    // Treat it the same as transcribed speech, e.g.:
    //   sendToPipeline({ transcript: text, whiteboardSnapshot: lastSnapshotRef.current });
  }

  function stop() {
    dcRef.current?.close();
    pcRef.current?.close();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());

    dcRef.current = null;
    pcRef.current = null;
    micStreamRef.current = null;

    setStarted(false);
    setMuted(false);
    setSubtitles("");
    setUserTranscript("");
    setStatus("Session ended");
  }

  useEffect(() => {
    start();
    return () => {
      try {
        stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/session")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">{SITE_NAME}</h1>
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Virtual TA panel */}
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-card/30">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Virtual TA</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="w-64 h-64 opacity-60">
              <LovelaceToroid animate={started} size={256} />
            </div>

            {subtitles && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-8 left-6 right-6 bg-card/90 backdrop-blur border border-border rounded-xl px-5 py-4"
              >
                <p className="text-sm leading-relaxed">{subtitles}</p>
              </motion.div>
            )}

            {!started && !subtitles && (
              <p className="mt-6 text-sm text-muted-foreground text-center max-w-xs">
                Start the session, then hold the Talk button to speak. Release to send your message.
              </p>
            )}
          </div>

          {/* Log panel */}
          {log && (
            <div
              ref={(el) => {
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="border-t border-border bg-muted/30 px-4 py-2 max-h-24 overflow-auto"
            >
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{log}</pre>
            </div>
          )}
        </div>

        {/* Right: User Input + Whiteboard */}
        <div className="w-1/2 flex flex-col">
          {/* User Input header with toggle */}
          <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">User Input</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono uppercase tracking-wider ${inputMode === "audio" ? "text-primary font-semibold" : "text-muted-foreground"}`}
              >
                Audio
              </span>
              <Switch
                checked={inputMode === "text"}
                onCheckedChange={(checked) => setInputMode(checked ? "text" : "audio")}
              />
              <span
                className={`text-xs font-mono uppercase tracking-wider ${inputMode === "text" ? "text-primary font-semibold" : "text-muted-foreground"}`}
              >
                Text
              </span>
            </div>
          </div>

          {/* User Input controls */}
          <div className="bg-card/30 px-4 py-5 flex items-center justify-center gap-3">
            {inputMode === "audio" ? (
              <>
                <span className="text-xs font-mono text-muted-foreground mr-2">{status}</span>
                <Button
                  size="sm"
                  variant={talking ? "destructive" : "default"}
                  className="gap-2"
                  onClick={toggleTalking}
                  disabled={muted}
                >
                  {talking ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {talking ? "Stop" : "Talk"}
                </Button>
              </>
            ) : (
              <div className="flex w-full gap-2 items-center">
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message…"
                  className="min-h-[48px] max-h-[80px] resize-none flex-1 bg-white dark:bg-muted text-foreground overflow-y-auto break-words"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendTextMessage();
                    }
                  }}
                />
                <Button size="icon" onClick={sendTextMessage} disabled={!textInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Whiteboard */}
          <div className="px-4 py-2 border-t border-b border-border bg-card/30">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Whiteboard</span>
          </div>
          <div className="flex-1 min-h-0">
            <Whiteboard canvasRef={canvasRef} className="h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
