"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type InvitationIntroProps = {
  groomName: string;
  brideName: string;
  /** Localized date label (formatted upstream). Falls back to nothing when absent. */
  dateLabel?: string;
  /** Storage key — change to force-show once for a new launch. */
  storageKey?: string;
};

type Stage =
  | "closed" /* envelope visible, awaiting tap */
  | "opening" /* flap up + card rises */
  | "expanding" /* card scales to fill */
  | "fading" /* overlay fades to reveal landing */
  | "done"; /* unmounted */

/**
 * Animated invitation envelope shown on first visit.
 *
 * Sequence (when reduced motion is OFF):
 *  closed → opening (flap rotates, seal lifts)
 *         → expanding (card scales to viewport)
 *         → fading (overlay alpha → 0)
 *         → done (component unmounts).
 *
 * When `prefers-reduced-motion` is set we skip straight to a 0.4s fade so the
 * page is reachable instantly. The intro is shown at most once per session.
 */
export function InvitationIntro({
  groomName,
  brideName,
  dateLabel,
  storageKey = "al-invitation-intro-seen",
}: InvitationIntroProps) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("closed");
  const [introVisibility, setIntroVisibility] = useState<"checking" | "show" | "hide">(
    "checking",
  );
  const advance = useCallback(() => {
    setStage((current) => {
      switch (current) {
        case "closed":
          return "opening";
        case "opening":
          return "expanding";
        case "expanding":
          return "fading";
        case "fading":
          return "done";
        default:
          return current;
      }
    });
  }, []);

  // Decide whether to show the intro at all — only on first visit per session.
  // While checking, render a full-screen background so landing content never
  // flashes before the intro appears.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        setIntroVisibility("hide");
        return;
      }
    } catch {
      /* private mode — fall through and just show */
    }
    setIntroVisibility("show");
  }, [storageKey]);

  // Lock body scroll while overlay is open, restore on unmount.
  useEffect(() => {
    if (introVisibility !== "show" || stage === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [introVisibility, stage]);

  // Persist the "seen" flag the moment the user opens — don't wait for the
  // animation to finish, so a refresh mid-animation still counts as seen.
  const persistSeen = useCallback(() => {
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const open = useCallback(() => {
    if (stage !== "closed") return;
    persistSeen();
    if (reduceMotion) {
      // Reduced-motion path: jump straight to fade-out.
      advance(); // → opening
      advance(); // → expanding
      advance(); // → fading
      window.setTimeout(() => advance(), 350);
      return;
    }
    advance(); // → opening
  }, [advance, persistSeen, reduceMotion, stage]);

  // Auto-advance through stages when not in reduced-motion mode.
  // Timings are deliberately unhurried — an invitation should feel ceremonial,
  // not snappy. Keep "opening" longer so guests can read the card briefly.
  useEffect(() => {
    if (reduceMotion) return;
    let timer: number | undefined;
    if (stage === "opening") {
      timer = window.setTimeout(() => advance(), 2800);
    } else if (stage === "expanding") {
      timer = window.setTimeout(() => advance(), 1100);
    } else if (stage === "fading") {
      timer = window.setTimeout(() => advance(), 560);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [advance, stage, reduceMotion]);

  const skip = useCallback(() => {
    persistSeen();
    advance(); // closed → opening
    // Jump to fading on the next tick so the auto-advance effect can short-circuit.
    window.setTimeout(() => {
      advance(); // → expanding
      advance(); // → fading
      window.setTimeout(() => advance(), 380);
    }, 30);
  }, [advance, persistSeen]);

  // Listen for keyboard: Enter/Space → open, Esc → skip immediately.
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (introVisibility !== "show" || stage === "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (stage === "closed" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        open();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introVisibility, stage, open, skip]);

  if (introVisibility === "checking") {
    return <div className="fixed inset-0 z-[200] bg-background" aria-hidden />;
  }

  if (introVisibility === "hide" || stage === "done") return null;

  const initials = (raw: string) => raw.trim().charAt(0).toUpperCase() || "·";
  const groomInitial = initials(groomName);
  const brideInitial = initials(brideName);

  return (
    <AnimatePresence>
      {(
        <motion.div
          ref={overlayRef}
          key="invitation-intro"
          role="dialog"
          aria-modal="true"
          aria-label="You are invited — tap to open"
          className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center px-6",
            "bg-background",
          )}
          initial={{ opacity: 1 }}
          animate={{ opacity: stage === "fading" ? 0 : 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Soft warm radial glow + faint paper grain — pure decoration. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in oklab, var(--accent) 80%, var(--background)) 0%, var(--background) 70%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply"
            style={{
              backgroundImage:
                "radial-gradient(rgba(30,35,15,0.6) 1px, transparent 1px)",
              backgroundSize: "3px 3px",
            }}
          />

          {/* Stage container — perspective for the 3D flap. */}
          <div
            className="relative flex flex-col items-center"
            style={{ perspective: "1400px" }}
          >
            {/* Top monogram + "you are invited" */}
            <motion.div
              className="mb-7 flex flex-col items-center text-center"
              animate={{
                opacity: stage === "closed" ? 1 : 0,
                y: stage === "closed" ? 0 : -16,
              }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <p
                className="text-[10.5px] tracking-[0.32em] uppercase text-primary/85 [font-family:var(--font-playfair)]"
              >
                You are invited
              </p>
            </motion.div>

            {/* Envelope */}
            <motion.button
              type="button"
              onClick={open}
              disabled={stage !== "closed"}
              className={cn(
                "group relative outline-none",
                stage === "closed" && "cursor-pointer",
              )}
              aria-label="Open invitation"
              animate={{
                scale: stage === "expanding" ? 14 : 1,
                opacity: stage === "expanding" || stage === "fading" ? 0 : 1,
              }}
              transition={{
                duration: stage === "expanding" ? 1.1 : 0.45,
                ease: [0.65, 0, 0.35, 1],
              }}
              style={{ transformOrigin: "center center" }}
            >
              {/* Envelope body — sized to match an invitation envelope.
                  Layers (back to front, z order):
                    z=0  card (hidden behind back panel, slides UP and out the top)
                    z=1  back panel (full rectangle — the body of the envelope)
                    z=2  back-panel V seams (suggesting the rear flaps)
                    z=3  top flap (triangle, rotates open)
                    z=4  wax seal (lifts away on open) */}
              <div
                className="relative h-[14rem] w-[22rem] sm:h-[15.5rem] sm:w-[24rem]"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* CARD — fully tucked inside the envelope. Sits at z=0 so the
                    back panel completely hides it while closed. On open it
                    slides up; the bottom of the card stays visually clipped by
                    the back panel until it rises above the top edge. */}
                <motion.div
                  className="absolute left-1/2 top-1/2 h-[12rem] w-[18.5rem] -translate-x-1/2 rounded-[3px] sm:h-[13.6rem] sm:w-[21rem]"
                  style={{
                    zIndex: 0,
                    background:
                      "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--background) 92%, var(--accent)) 100%)",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.5) inset, 0 24px 36px -22px rgba(30,35,15,0.35)",
                  }}
                  initial={{ y: "-50%" }}
                  animate={{
                    y:
                      stage === "opening" || stage === "expanding"
                        ? "-112%"
                        : "-50%",
                  }}
                  transition={{
                    duration: 1.25,
                    ease: [0.22, 1, 0.36, 1], // soft, easeOutQuint feel
                    delay: stage === "opening" ? 0.55 : 0,
                  }}
                >
                  {/* Card content — minimalist invitation card */}
                  <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="h-px w-8 bg-primary/30" aria-hidden />
                      <span
                        className="block h-1.5 w-1.5 rotate-45 border border-primary/45"
                        aria-hidden
                      />
                      <span className="h-px w-8 bg-primary/30" aria-hidden />
                    </div>
                    <p
                      className="mt-3 text-[10px] tracking-[0.32em] uppercase text-primary/85 [font-family:var(--font-playfair)]"
                    >
                      Together with their families
                    </p>
                    <p
                      className="mt-2.5 text-[1.7rem] font-light leading-[1.05] text-foreground sm:text-[1.9rem]"
                      style={{ fontFamily: "var(--font-cormorant)" }}
                    >
                      {groomName}{" "}
                      <span
                        className="font-light text-foreground/40"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        &amp;
                      </span>{" "}
                      {brideName}
                    </p>
                    {dateLabel ? (
                      <p className="mt-2 text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground [font-family:var(--font-playfair)]">
                        {dateLabel}
                      </p>
                    ) : null}
                  </div>
                </motion.div>

                {/* BACK PANEL — solid envelope body. Sits in front of the
                    card so the card stays hidden until it rises above the top
                    edge. Parchment-sage tone for a softer feel. */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-[6px]"
                  style={{
                    zIndex: 1,
                    background:
                      "linear-gradient(150deg, color-mix(in oklab, var(--primary) 32%, var(--accent)) 0%, color-mix(in oklab, var(--primary) 52%, var(--accent)) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.18), 0 22px 42px -20px rgba(30,35,15,0.45), 0 8px 14px -6px rgba(30,35,15,0.22)",
                  }}
                >
                  {/* Faint paper texture */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                    style={{
                      backgroundImage:
                        "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
                      backgroundSize: "2.5px 2.5px",
                    }}
                  />

                  {/* Rear flap seams — diagonals from envelope center down to
                      the bottom-left & bottom-right corners. These pair with
                      the top flap edges to suggest the classic X seam. */}
                  <svg
                    aria-hidden
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <line
                      x1="50"
                      y1="50"
                      x2="0"
                      y2="100"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="0.35"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1="50"
                      y1="50"
                      x2="100"
                      y2="100"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="0.35"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Soft top-left highlight for paper sheen */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 38%)",
                    }}
                  />
                </div>

                {/* TOP FLAP — triangle laying flat over the upper half of the
                    envelope when closed, apex at center. Rotates UP on open. */}
                <motion.div
                  aria-hidden
                  className="absolute inset-x-0 top-0 origin-top"
                  style={{
                    zIndex: 3,
                    transformStyle: "preserve-3d",
                    height: "100%",
                    clipPath: "polygon(0 0, 100% 0, 50% 50%)",
                    background:
                      "linear-gradient(165deg, color-mix(in oklab, var(--primary) 26%, var(--accent)) 0%, color-mix(in oklab, var(--primary) 48%, var(--accent)) 100%)",
                    boxShadow:
                      "inset 0 -1px 0 rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.10)",
                  }}
                  animate={{
                    rotateX: stage === "closed" ? 0 : -178,
                  }}
                  transition={{
                    duration: 0.95,
                    ease: [0.65, 0, 0.35, 1],
                  }}
                />

                {/* WAX SEAL — sits exactly at the flap apex (centre of the
                    envelope, where flap meets the back panel). Lifts and
                    fades on open. */}
                <motion.div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[3.4rem] sm:w-[3.4rem]"
                  style={{
                    zIndex: 4,
                    background:
                      "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--primary) 96%, white) 0%, color-mix(in oklab, var(--primary) 82%, black 0%) 58%, color-mix(in oklab, var(--primary) 60%, black) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -2px 4px rgba(0,0,0,0.32), 0 8px 18px -8px rgba(30,35,15,0.55)",
                  }}
                  animate={{
                    scale: stage === "closed" ? 1 : 1.22,
                    opacity: stage === "closed" ? 1 : 0,
                    y: stage === "closed" ? 0 : -32,
                  }}
                  transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
                >
                  <div className="flex h-full w-full items-center justify-center text-primary-foreground/95">
                    <span
                      className="text-[15px] font-light tracking-[0.04em] sm:text-[17px]"
                      style={{ fontFamily: "var(--font-cormorant)" }}
                    >
                      {groomInitial}
                      <span
                        className="mx-0.5 font-light opacity-70"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        &amp;
                      </span>
                      {brideInitial}
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.button>

            {/* Minimal helper note while closed */}
            <motion.div
              className="mt-7 text-center"
              animate={{
                opacity: stage === "closed" ? 1 : 0,
                y: stage === "closed" ? 0 : 8,
              }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              aria-hidden
            >
              <span className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/55 [font-family:var(--font-playfair)]">
                Tap to open
              </span>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
