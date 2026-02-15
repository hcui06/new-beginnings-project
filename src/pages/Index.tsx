import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/config/site";
import MathSymbols from "@/components/MathSymbols";
import SpirographCanvas from "@/components/SpirographCanvas";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const [transitioning, setTransitioning] = useState(false);

  const handleBegin = () => {
    setTransitioning(true);
    // Navigate after the spirograph animation plays
    setTimeout(() => navigate("/session"), 2000);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <MathSymbols />

      <AnimatePresence>
        {!transitioning && (
          <motion.div
            className="relative z-10 flex max-w-2xl flex-col items-center text-center"
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            <span className="mb-6 inline-block rounded-full border border-border bg-card px-4 py-1.5 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Virtual Office Hours
            </span>

            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Welcome to{" "}
              <span className="text-primary">{SITE_NAME}</span>
            </h1>

            <p className="mt-4 text-lg text-muted-foreground font-light max-w-lg">
              {SITE_TAGLINE}
            </p>

            <p className="mt-2 text-sm text-muted-foreground/70 max-w-md">
              {SITE_DESCRIPTION}
            </p>

            <Button
              size="lg"
              className="mt-10 animate-pulse-glow text-base px-10 py-6 rounded-xl font-semibold"
              onClick={handleBegin}
            >
              Begin
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spirograph transition overlay */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{
                scale: 1,
                rotate: 0,
                opacity: 1,
              }}
              transition={{
                duration: 1.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                filter: "drop-shadow(0 0 24px hsla(280, 30%, 55%, 0.35))",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1, 1.04, 1] }}
                transition={{
                  duration: 1.8,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0.2,
                }}
              >
                <SpirographCanvas animate size={500} />
              </motion.div>
            </motion.div>

            <motion.p
              className="absolute bottom-24 text-sm font-mono text-muted-foreground tracking-widest uppercase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              Entering session…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
