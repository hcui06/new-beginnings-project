import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SITE_NAME } from "@/config/site";
import { Button } from "@/components/ui/button";
import Whiteboard from "@/components/Whiteboard";
import SpirographCanvas from "@/components/SpirographCanvas";
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { motion } from "framer-motion";

const Workspace = () => {
  const navigate = useNavigate();

  // ===== realtime state =====
  const [status, setStatus] = useState("Ready to start");
  const [subtitles, setSubtitles] = useState("");
  const [log, setLog] = useState("");
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // ===== whiteboard =====
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function appendLog(s: string) {
    setLog((prev) => prev + s + "\n");
  }

  function sendEvent(evt: Record<string, unknown>) {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(evt));
  }

  function finalizeAndSendTurn(text: string) {
    if (text) {
      appendLog("YOU: " + text);
      setUserTranscript(text);
      setTimeout(() => setUserTranscript(""), 4000);
    }

    if (!text) return;

    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendEvent({ type: "response.create" });
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

      let turnTranscript = "";

      dc.onopen = () => {
        setStarted(true);
        setStatus("Connected — speak naturally");

        sendEvent({
          type: "session.update",
          session: {
            input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
            modalities: ["text", "audio"],
            turn_detection: {
              type: "server_vad",
              threshold: 0.75,
              prefix_padding_ms: 250,
              silence_duration_ms: 1000,
              create_response: false,
              interrupt_response: true,
            },
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

        if (evt.type === "input_audio_buffer.speech_started") {
          turnTranscript = "";
          appendLog("speech_started");
          return;
        }

        if (evt.type === "conversation.item.input_audio_transcription.delta") {
          turnTranscript += (evt.delta as string) || "";
          return;
        }

        if (evt.type === "conversation.item.input_audio_transcription.completed") {
          turnTranscript = (evt.transcript as string) || turnTranscript || "";
          return;
        }

        if (evt.type === "input_audio_buffer.speech_stopped") {
          appendLog("speech_stopped");
          setTimeout(() => {
            const text = (turnTranscript || "").trim();
            finalizeAndSendTurn(text);
            turnTranscript = "";
          }, 250);
          return;
        }

        if (evt.type === "response.output_text.delta" && evt.delta) {
          setSubtitles((prev) => prev + (evt.delta as string));
          return;
        }

        if (evt.type === "response.output_text.done") {
          setTimeout(() => setSubtitles(""), 1200);
          return;
        }

        if (evt.type === "error") {
          appendLog("ERROR: " + ((evt.error as any)?.message || JSON.stringify(evt)));
        }
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
      setStatus("Live — speak naturally");
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
    setStatus(next ? "Muted" : "Live — speak naturally");
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

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground mr-2">{status}</span>

          {!started ? (
            <Button size="sm" className="gap-2" onClick={start}>
              <Phone className="h-4 w-4" />
              Start Session
            </Button>
          ) : (
            <>
              <Button size="icon" variant={muted ? "destructive" : "outline"} className="h-8 w-8" onClick={toggleMute}>
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="destructive" className="h-8 w-8" onClick={stop}>
                <PhoneOff className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
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
              <SpirographCanvas animate={started} size={256} />
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
                Start the session to connect with your AI teaching assistant. Speak naturally and draw on the
                whiteboard.
              </p>
            )}
          </div>

          {/* Log panel */}
          {log && (
            <div className="border-t border-border bg-muted/30 px-4 py-2 max-h-40 overflow-auto">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{log}</pre>
            </div>
          )}
        </div>

        {/* Right: Whiteboard + Transcript */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-card/30">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Whiteboard</span>
          </div>
          <div className="flex-1 min-h-0">
            <Whiteboard canvasRef={canvasRef} className="h-full" />
          </div>

          {/* Transcript display — shows what user said */}
          {userTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="border-t border-border bg-card/50 px-4 py-3"
            >
              <p className="text-sm leading-relaxed font-mono text-muted-foreground">You: {userTranscript}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
