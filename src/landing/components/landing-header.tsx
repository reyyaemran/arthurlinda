"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Our Story", id: "our-story" },
  { label: "When & Where", id: "when-where" },
  { label: "R.S.V.P.", id: "rsvp-section" },
  { label: "Stay", id: "accommodation" },
] as const;

/** Sections where the floating nav uses light-on-dark treatment (hero handles its own contrast). */
const DARK_SECTION_IDS: string[] = [];
const PROBE_Y = 36;

export function LandingHeader() {
  const [onDark, setOnDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;

    const update = () => {
      const y = window.scrollY;
      // hide when scrolling down past 80px; reveal when scrolling up
      if (y > 80) {
        setHidden(y > lastY);
      } else {
        setHidden(false);
      }
      lastY = y;

      setOnDark(
        DARK_SECTION_IDS.some((id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const { top, bottom } = el.getBoundingClientRect();
          return top <= PROBE_Y && bottom >= PROBE_Y;
        }),
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  /** Auto-close mobile menu: outside tap, Escape, or any scroll. */
  useEffect(() => {
    if (!mobileOpen) return;

    const close = () => setMobileOpen(false);

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (mobileMenuTriggerRef.current?.contains(t)) return;
      if (mobileDrawerRef.current?.contains(t)) return;
      close();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", close, { capture: true });
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const links = NAV_LINKS;

  const textColor = onDark ? "rgba(251,248,239,0.96)" : "rgba(43,50,16,0.92)";
  const textHover = onDark ? "#fbf8ef" : "#1f250c";
  const logoColor = onDark ? "#fbf8ef" : "#1f250c";
  const dotColor  = onDark ? "rgba(251,248,239,0.55)" : "rgba(43,50,16,0.48)";

  const navGlassStyle = {
    background: onDark
      ? "radial-gradient(ellipse 95% 65% at 50% -35%, rgba(255,255,255,0.14) 0%, transparent 52%), linear-gradient(172deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 48%, rgba(0,0,0,0.07) 100%)"
      : "radial-gradient(ellipse 100% 72% at 50% -42%, rgba(255,255,255,0.45) 0%, transparent 55%), linear-gradient(172deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 44%, rgba(255,255,255,0.09) 100%)",
    boxShadow: onDark
      ? "0 4px 22px -4px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(0, 0, 0, 0.18) inset, 0 -1px 0 rgba(0, 0, 0, 0.18) inset, inset 0 14px 28px -14px rgba(255, 255, 255, 0.1)"
      : "0 4px 24px -4px rgba(43, 50, 16, 0.09), 0 1px 0 rgba(43, 50, 16, 0.05) inset, 0 -1px 0 rgba(43, 50, 16, 0.05) inset, inset 0 16px 32px -16px rgba(255, 255, 255, 0.3)",
    transition: "box-shadow 0.45s ease, background 0.45s ease",
  } as const;

  return (
    <>
      {/* ── Full-width floating bar ── */}
      <div
        className="fixed inset-x-0 top-6 z-50 px-6 sm:px-8"
        style={{
          transform: hidden ? "translateY(-80px)" : "translateY(0)",
          opacity: hidden ? 0 : 1,
          pointerEvents: hidden ? "none" : "auto",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 sm:gap-6">
          {/* Logo — outside glass */}
          <button
            type="button"
            onClick={() => scrollTo("hero")}
            aria-label="Scroll to top"
            className="flex shrink-0 items-baseline transition-opacity duration-300 hover:opacity-50"
            style={{
              fontFamily: "var(--font-cormorant)",
              color: logoColor,
              transition: "color 0.45s ease, opacity 0.3s ease",
            }}
          >
            <span className="text-[1.75rem] font-normal leading-none tracking-[0.06em]">A</span>
            <span
              aria-hidden="true"
              className="mx-[3px] text-[1.2rem] font-normal leading-none"
              style={{ color: dotColor, transition: "color 0.45s ease" }}
            >·</span>
            <span className="text-[1.75rem] font-normal leading-none tracking-[0.06em]">L</span>
          </button>

          {/* Menu only — rounded rect glass (not pill), same blur as before */}
          <div
            ref={mobileMenuTriggerRef}
            className={cn(
              "isolate flex items-center rounded-2xl border-0 px-3 py-2 backdrop-blur-xl backdrop-saturate-150 sm:px-5 sm:py-2.5 md:px-6 md:py-2.5 md:backdrop-blur-[3px] md:backdrop-saturate-[1.08]",
            )}
            style={navGlassStyle}
          >
            <nav aria-label="Page sections" className="hidden items-center gap-6 md:flex lg:gap-9">
              {links.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollTo(link.id)}
                  className="whitespace-nowrap text-[14px] tracking-[0.18em] uppercase"
                  style={{
                    fontFamily: "var(--font-playfair)",
                    color: textColor,
                    transition: "color 0.45s ease",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = textHover)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = textColor)}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="flex md:hidden"
              style={{
                color: textColor,
                transition: "color 0.45s ease",
              }}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer — refined glass panel ── */}
      <div
        ref={mobileDrawerRef}
        className={cn(
          "fixed left-5 right-5 top-[4.5rem] z-40 isolate overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden",
          mobileOpen && !hidden ? "max-h-72 opacity-100" : "max-h-0 opacity-0 pointer-events-none",
        )}
        style={{
          borderRadius: "22px",
          border: "1px solid",
          borderColor: onDark ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.4)",
          background: onDark
            ? "linear-gradient(168deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 48%, rgba(0,0,0,0.04) 100%)"
            : "linear-gradient(168deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0.015) 100%)",
          backdropFilter: "blur(22px) saturate(1.14)",
          WebkitBackdropFilter: "blur(22px) saturate(1.14)",
          boxShadow: onDark
            ? "0 4px 24px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.1)"
            : "0 4px 24px rgba(43, 50, 16, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(43, 50, 16, 0.035)",
        }}
      >
        <ul className="flex flex-col px-6 py-6">
          {links.map((link, i) => (
            <li
              key={link.id}
              style={i > 0 ? { borderTop: `1px solid ${onDark ? "rgba(250,247,238,0.07)" : "rgba(37,45,14,0.06)"}` } : {}}
            >
              <button
                type="button"
                onClick={() => scrollTo(link.id)}
                className="w-full py-3 text-left text-[14px] tracking-[0.2em] uppercase"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: onDark ? "rgba(250,247,238,0.82)" : "rgba(37,45,14,0.78)",
                }}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
