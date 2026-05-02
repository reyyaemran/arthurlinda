"use client";

import { Fragment, useRef, useEffect, useState } from "react";
import { addDays } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import Image from "next/image";
import type { PublicWeddingPayload } from "@/lib/wedding/queries";
import { storySlideImageUrl } from "@/lib/wedding/landing-content";
import { Countdown } from "./components/countdown";
import { RsvpForm } from "./components/rsvp-form";
import { ScrollReveal } from "./components/scroll-reveal";
import { LandingHeader } from "./components/landing-header";
import { InvitationIntro } from "./components/invitation-intro";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

/** On-site venue photos for the Where → Gallery tab (`public/venue-gallery/`). */
const VENUE_GALLERY_IMAGES: { src: string; alt: string }[] = [
  {
    src: "/venue-gallery/SAI-102025-TB-CAMBODIA_ANGKOR-GRACE-ENTRANCE-011-c9989aa5-dc2b-42ae-9d88-8840e316282c.png",
    alt: "Resort entrance at dusk",
  },
  {
    src: "/venue-gallery/021_RAA09276-3d42414c-cd25-433d-bb26-63c7ed05085f.png",
    alt: "Terracotta facade and garden screen",
  },
  {
    src: "/venue-gallery/007_RAA08427-f49a61e3-a162-43ae-bdfa-2b1de0ab99f4.png",
    alt: "Pool and sundeck with lounge seating",
  },
  {
    src: "/venue-gallery/011_A7406142-e349bfc8-1a02-4242-9ed7-fbfb08bc1146.png",
    alt: "Courtyard pool and balconies",
  },
  {
    src: "/venue-gallery/006_RAA08418-c97c8cf5-976a-41a5-b317-4aef7304f7e8.png",
    alt: "Pool at golden hour",
  },
  {
    src: "/venue-gallery/bedroom-in-angkor-grace-96df984d-7e72-48b9-a0ae-55d654ee2018.png",
    alt: "Guest suite bedroom",
  },
  {
    src: "/venue-gallery/living-room-in-angkor-grace-1-76427e8c-3b72-491f-a0d9-3f49ca8ba9f9.png",
    alt: "Living room",
  },
  {
    src: "/venue-gallery/TB-ANGKOR-GRACE-FOUR-BED-TRIPLEX-SUITE-127-749f306f-b814-4b95-8e5a-2cda50b1a33a.png",
    alt: "Open kitchen and dining",
  },
  {
    src: "/venue-gallery/kitchen-in-angkor-grace-41dcd84f-465e-4dfe-b174-f9ff691c6c8a.png",
    alt: "Kitchen and dining area",
  },
];

const VENUE_HERO = VENUE_GALLERY_IMAGES[0]!;

/**
 * Parse star count from a free-form category string (e.g. "Five star resort" → 5).
 * Falls back to `0` so unrecognized categories collapse into a single "Other" group.
 */
function detectStarCount(category: string): number {
  const text = category.toLowerCase();
  if (/\b(5|five|★★★★★)\b|five[\s-]?star/.test(text)) return 5;
  if (/\b(4|four|★★★★)\b|four[\s-]?star/.test(text)) return 4;
  if (/\b(3|three|★★★)\b|three[\s-]?star/.test(text)) return 3;
  if (/\b(2|two|★★)\b|two[\s-]?star/.test(text)) return 2;
  if (/\b(1|one|★)\b|one[\s-]?star/.test(text)) return 1;
  return 0;
}

/** Synxis booking for Angkor Grace (`hotel=41365`, `chain=30801`) — dates use the wedding timezone. */
function synxisVenueBookingUrl(eventDateIso: string, timeZone: string): string {
  const start = new Date(eventDateIso);
  const end = addDays(start, 1);
  const params = new URLSearchParams({
    adult: "1",
    arrive: start.toLocaleDateString("en-CA", { timeZone }),
    chain: "30801",
    child: "0",
    currency: "USD",
    depart: end.toLocaleDateString("en-CA", { timeZone }),
    hotel: "41365",
    level: "hotel",
    locale: "en-US",
    productcurrency: "USD",
    rooms: "1",
  });
  return `https://be.synxis.com/?${params.toString()}`;
}

export function WeddingLanding({ data }: { data: PublicWeddingPayload }) {
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroChevronRef = useRef<HTMLDivElement>(null);
  const storySectionRef = useRef<HTMLElement>(null);
  const storyViewportRef = useRef<HTMLDivElement>(null);
  const storyTrackRef = useRef<HTMLDivElement>(null);
  const whenWhereSectionRef = useRef<HTMLElement>(null);
  const whenWhereMarkerRef = useRef<SVGCircleElement>(null);
  const whenWherePathRef = useRef<SVGPathElement>(null);
  const whenColumnRef = useRef<HTMLDivElement>(null);
  const heroSvgRef = useRef<HTMLDivElement>(null);
  const [heroSvg, setHeroSvg] = useState<string | null>(null);
  const [venueLightboxIndex, setVenueLightboxIndex] = useState<number | null>(null);
  const [useNativeStoryScroll, setUseNativeStoryScroll] = useState(false);
  const [showStorySwipeHint, setShowStorySwipeHint] = useState(false);
  const wedding = data;
  const landing = wedding.landing;
  const venueMapsQuery = [wedding.venueName, wedding.venueAddress].filter(Boolean).join(", ");
  const venueMapsUrl = wedding.venueMapUrl?.trim()
    ? wedding.venueMapUrl.trim()
    : `https://maps.google.com/maps?q=${encodeURIComponent(venueMapsQuery)}`;
  const tz = wedding.timezone ?? "Asia/Phnom_Penh";
  const venueBookUrl = synxisVenueBookingUrl(wedding.eventDate, tz);
  const scheduleEvents = data.events;
  const eventDate = new Date(wedding.eventDate);

  // Hosts line: traditional invitation copy, only rendered if either side is filled.
  const hostsLine = (() => {
    const groomHosts = wedding.groomParents?.trim();
    const brideHosts = wedding.brideParents?.trim();
    if (!groomHosts && !brideHosts) return null;
    return { groomHosts, brideHosts };
  })();

  // Group admin-saved accommodations by detected star tier; preserve admin order
  // within each group. Only tiers with at least one hotel are rendered.
  const accommodationGroups = (() => {
    type Tier = { key: string; label: string; tabLabel: string; hotels: typeof landing.accommodations };
    const tiers: Record<number, Tier> = {
      5: { key: "five-star", label: "Five star resort", tabLabel: "5 Stars", hotels: [] },
      4: { key: "four-star", label: "Four star", tabLabel: "4 Stars", hotels: [] },
      3: { key: "three-star", label: "Three star", tabLabel: "3 Stars", hotels: [] },
      2: { key: "two-star", label: "Two star", tabLabel: "2 Stars", hotels: [] },
      1: { key: "one-star", label: "One star", tabLabel: "1 Star", hotels: [] },
      0: { key: "other", label: "Other", tabLabel: "Other", hotels: [] },
    };
    for (const hotel of landing.accommodations) {
      const stars = detectStarCount(hotel.category);
      tiers[stars]?.hotels.push(hotel);
    }
    return [5, 4, 3, 2, 1, 0]
      .map((k) => tiers[k]!)
      .filter((g) => g.hotels.length > 0);
  })();

  const formattedDate = eventDate.toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatEventTime = (start: string, end?: string) => {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
    };
    const a = new Date(start).toLocaleTimeString("en-US", opts);
    if (!end) return a;
    return `${a} – ${new Date(end).toLocaleTimeString("en-US", opts)}`;
  };

  /** Landing lives at `/`; drop legacy `#home` so the URL bar stays clean. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") return;
    if (window.location.hash !== "#home") return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);

  const scrollToRsvp = () => {
    document.getElementById("rsvp-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Hero content is static — no entrance animation on text.
  // The flower SVG wind sway is handled purely by CSS (globals.css).

  // Story section: use native touch scrolling on mobile, GSAP pin on larger screens.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const syncMode = () => setUseNativeStoryScroll(media.matches);
    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, []);

  // Mobile hint: keep showing while there are more cards to the right.
  useEffect(() => {
    const viewport = storyViewportRef.current;
    if (!viewport || !useNativeStoryScroll) {
      setShowStorySwipeHint(false);
      return;
    }

    const updateHint = () => {
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      // Keep visible until the final card is reached.
      setShowStorySwipeHint(viewport.scrollLeft < Math.max(0, maxScrollLeft - 8));
    };

    const onScroll = () => {
      updateHint();
    };

    updateHint();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [useNativeStoryScroll]);

  // Scroll-driven horizontal gallery: start centered, keep sliding centered
  useEffect(() => {
    if (useNativeStoryScroll) return;
    const section = storySectionRef.current;
    const viewport = storyViewportRef.current;
    const track = storyTrackRef.current;
    if (!section || !viewport || !track) return;

    const firstCard = track.firstElementChild as HTMLElement;
    const lastCard = track.lastElementChild as HTMLElement;
    if (!firstCard || !lastCard) return;

    const getXStart = () => {
      const V = viewport.offsetWidth;
      const center = firstCard.offsetLeft + firstCard.offsetWidth / 2;
      return V / 2 - center;
    };
    const getXEnd = () => {
      const V = viewport.offsetWidth;
      const center = lastCard.offsetLeft + lastCard.offsetWidth / 2;
      return V / 2 - center;
    };

    gsap.set(track, { x: getXStart() });

    const anim = gsap.to(track, {
      x: getXEnd,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=200%",
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, [useNativeStoryScroll]);

  // When timeline: marker dot follows the path via getPointAtLength (SVG-native coords)
  useEffect(() => {
    const marker = whenWhereMarkerRef.current;
    const whenCol = whenColumnRef.current;
    const pathEl = whenWherePathRef.current;
    if (!marker || !whenCol || !pathEl) return;

    const progress = { t: 0 };

    const anim = gsap.to(progress, {
      t: 1,
      ease: "none",
      onUpdate() {
        const len = pathEl.getTotalLength();
        const pt = pathEl.getPointAtLength(progress.t * len);
        marker.setAttribute("cx", String(pt.x));
        marker.setAttribute("cy", String(pt.y));
      },
      scrollTrigger: {
        trigger: whenCol,
        start: "top 70%",
        end: "bottom 30%",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/Hero.svg")
      .then((r) => r.text())
      .then((raw) => {
        if (cancelled) return;
        setHeroSvg(raw.replace(/^<\?xml[^>]*>\s*/, ""));
      })
      .catch(() => {
        if (!cancelled) setHeroSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!heroSvg) return;
    const root = heroSvgRef.current;
    if (!root) return;
    const paths = root.querySelectorAll<SVGPathElement>(
      ".hero-flower-petal, .hero-leaf, .hero-stem",
    );
    const n = paths.length;
    paths.forEach((el, i) => {
      const phase = (i / Math.max(n, 1)) * 2.4;
      el.style.setProperty("--hero-wind-delay", `${phase % 2}s`);
      el.style.setProperty(
        "--hero-wind-duration",
        `${3.1 + (i % 13) * 0.16}s`,
      );
    });
  }, [heroSvg]);

  useEffect(() => {
    if (venueLightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setVenueLightboxIndex((i) =>
          i === null || i === 0 ? VENUE_GALLERY_IMAGES.length - 1 : i - 1,
        );
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setVenueLightboxIndex((i) =>
          i === null || i >= VENUE_GALLERY_IMAGES.length - 1 ? 0 : i + 1,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [venueLightboxIndex]);

  const venueLightboxItem =
    venueLightboxIndex !== null ? VENUE_GALLERY_IMAGES[venueLightboxIndex] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <InvitationIntro
        groomName={wedding.groomName}
        brideName={wedding.brideName}
        dateLabel={formattedDate}
      />
      <LandingHeader />

      {/* ─── HERO — wind on fills + grey line art (.hero-line) ─ */}
      <section id="hero" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
        <div
          ref={heroSvgRef}
          className={cn(
            "hero-svg-wind pointer-events-none absolute inset-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full",
          )}
          dangerouslySetInnerHTML={heroSvg ? { __html: heroSvg } : undefined}
          aria-hidden
        />
        {/* Richer vignette — darker at edges for depth */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/80 via-background/35 to-background/92"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(250,247,238,0.55) 100%)",
          }}
          aria-hidden
        />
        <div ref={heroContentRef} className="relative z-10 mx-auto max-w-2xl text-center">
          {/* Eyebrow label with flanking rules */}
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-10 bg-primary opacity-30" aria-hidden />
            <p
              className="text-[14px] font-medium tracking-[0.28em] uppercase text-primary"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {landing.heroEyebrow}
            </p>
            <span className="h-px w-10 bg-primary opacity-30" aria-hidden />
          </div>

          {/* Hosts line — traditional invitation pattern (only when set) */}
          {hostsLine ? (
            <p
              className="mt-7 text-[12px] font-light italic leading-relaxed tracking-[0.08em] text-foreground/60 sm:text-[13px]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Together with{hostsLine.groomHosts && hostsLine.brideHosts ? " their families" : ""}
              {hostsLine.brideHosts ? (
                <>
                  <br />
                  <span className="text-foreground/75">{hostsLine.brideHosts}</span>
                </>
              ) : null}
              {hostsLine.brideHosts && hostsLine.groomHosts ? <span className="mx-2 text-foreground/30">·</span> : null}
              {hostsLine.groomHosts ? (
                <span className="text-foreground/75">{hostsLine.groomHosts}</span>
              ) : null}
            </p>
          ) : null}

          {/* Names — large, impactful */}
          <h1
            className="mt-6 text-[4.35rem] font-light leading-[1.05] tracking-[0.01em] text-foreground sm:text-[5.35rem] md:text-[7rem] lg:text-[8.5rem]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {wedding.groomName}
            <br />
            <span
              className="block text-[0.55em] font-light leading-[0.9] text-chart-5"
              style={{ letterSpacing: "0.15em" }}
            >
              &amp;
            </span>
            {wedding.brideName}
          </h1>

          {/* Full names — discreet line shown only if either is filled in admin */}
          {(wedding.groomFullName?.trim() || wedding.brideFullName?.trim()) ? (
            <p
              className="mt-4 text-[11px] font-light tracking-[0.28em] uppercase text-foreground/55 sm:text-[12px]"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {wedding.groomFullName?.trim() ?? wedding.groomName}
              <span className="mx-2 text-chart-5/60">&amp;</span>
              {wedding.brideFullName?.trim() ?? wedding.brideName}
            </p>
          ) : null}

          {/* Date — extra offset + stronger type on small screens */}
          <div className="mx-auto mt-14 flex items-center justify-center gap-3 sm:mt-9 sm:gap-4 md:mt-8">
            <span
              className="h-px flex-1 max-w-[52px] bg-foreground/22 sm:max-w-[56px] sm:bg-border sm:opacity-60"
              aria-hidden
            />
            <p
              className="max-w-[min(100%,22rem)] text-[19px] font-semibold leading-snug tracking-[0.11em] text-foreground sm:max-w-none sm:text-[18px] sm:font-medium sm:tracking-[0.18em]"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {formattedDate}
            </p>
            <span
              className="h-px flex-1 max-w-[52px] bg-foreground/22 sm:max-w-[56px] sm:bg-border sm:opacity-60"
              aria-hidden
            />
          </div>

          <div className="mt-16 sm:mt-14 md:mt-12">
            <Countdown targetDate={wedding.eventDate} />
          </div>

          {/* RSVP — glassy pill with fill */}
          <div className="mt-20 sm:mt-16 md:mt-16 lg:mt-20">
            <button
              type="button"
              onClick={scrollToRsvp}
              className="group relative inline-flex items-center overflow-hidden rounded-full px-7 py-2 text-[10px] tracking-[0.26em] uppercase text-chart-5 transition-colors duration-300 hover:text-background"
              style={{
                background: "rgba(222,110,39,0.08)",
                backdropFilter: "blur(14px) saturate(1.6)",
                WebkitBackdropFilter: "blur(14px) saturate(1.6)",
                border: "1px solid rgba(222,110,39,0.40)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
              }}
            >
              <span
                className="absolute inset-0 -translate-x-full bg-chart-5 transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden
              />
              <span className="relative">RSVP</span>
            </button>
          </div>
        </div>

        {/* Scroll cue — chevron only */}
        <div ref={heroChevronRef} className="absolute bottom-8 z-10 flex flex-col items-center">
          <ChevronDown className="h-4 w-4 text-chart-5/60" />
        </div>
      </section>

      {/* ─── OUR STORY + QUOTE — Body.svg (one band, same treatment as Stay + footer) ─── */}
      <div className="landing-body-band-deco border-t border-border">
      <section
        id="our-story"
        ref={storySectionRef}
        className="py-24 md:py-32"
      >
        <div className="relative z-[1] mb-12 px-6">
          <ScrollReveal>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-primary/30" aria-hidden />
              <p
                className="text-[14px] font-medium tracking-[0.28em] uppercase text-primary"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {landing.storySectionLabel}
              </p>
            </div>
          </ScrollReveal>
        </div>
        <div className="relative z-[1] w-full overflow-hidden">
          {useNativeStoryScroll && showStorySwipeHint ? (
            <div className="pointer-events-none absolute right-4 top-3 z-[2] flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/85 px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase text-primary shadow-sm backdrop-blur-sm">
              <span style={{ fontFamily: "var(--font-playfair)" }}>Swipe for more</span>
              <ChevronRight className="h-3.5 w-3.5 animate-pulse" />
            </div>
          ) : null}
          <div
            ref={storyViewportRef}
            className={cn(
              "our-story-gallery w-full overflow-y-hidden pb-8 pt-2",
              useNativeStoryScroll
                ? "overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
                : "overflow-x-hidden",
            )}
          >
            <div
              ref={storyTrackRef}
              className={cn(
                "flex w-max gap-5 px-6 md:gap-8 md:px-10",
                useNativeStoryScroll && "pr-[8vw]",
              )}
            >
              {landing.storySlides.map((slide, i) => {
                const storyImg = storySlideImageUrl(slide);
                return (
                  <article
                    key={i}
                    className={cn(
                      "our-story-card flex w-[88vw] shrink-0 flex-col overflow-hidden border border-border bg-card md:w-[520px]",
                      useNativeStoryScroll && "snap-center",
                    )}
                    style={{
                      borderRadius: "16px",
                      boxShadow: "0 8px 32px -4px rgba(30,35,15,0.08)",
                    }}
                  >
                    <div
                      className="photo-grain relative aspect-[4/3] w-full overflow-hidden"
                      style={{
                        background: storyImg
                          ? undefined
                          : "linear-gradient(135deg, #e8e5dc 0%, #d8d4c8 100%)",
                      }}
                    >
                      {storyImg ? (
                        <>
                          <Image
                            src={storyImg}
                            alt=""
                            fill
                            aria-hidden
                            className="photo-vintage-bw object-cover scale-105 blur-md saturate-150 opacity-95"
                            sizes="(max-width: 768px) 88vw, 520px"
                          />
                          <Image
                            src={storyImg}
                            alt=""
                            fill
                            className="photo-vintage-bw object-contain"
                            sizes="(max-width: 768px) 88vw, 520px"
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                          <span className="text-[9px] tracking-[0.22em] uppercase text-foreground" style={{ fontFamily: "var(--font-playfair)" }}>
                            Add photo
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col px-5 py-5 md:px-6 md:py-5">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span
                          className="h-px w-5 bg-primary opacity-60"
                          aria-hidden
                        />
                        <span
                          className="text-[9.5px] tracking-[0.30em] uppercase text-primary"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h3
                        className="font-normal leading-tight text-foreground"
                        style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem" }}
                      >
                        {slide.title}
                      </h3>
                      <p className="mt-3 text-[14.5px] font-light leading-[1.9] text-foreground/70">
                        {slide.text}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {wedding.quoteText && (
        <section className="relative z-[1] border-t border-border px-6 py-28 md:py-36">
          <div className="relative z-[1] mx-auto max-w-lg">
            <ScrollReveal>
              {/* Decorative open-quote mark */}
              <p
                className="mb-4 select-none text-[5rem] leading-none text-primary/10"
                style={{ fontFamily: "var(--font-cormorant)", lineHeight: "0.7" }}
                aria-hidden
              >
                &ldquo;
              </p>
              <blockquote
                className="text-[1.85rem] font-light italic leading-[1.75] text-foreground sm:text-[2.05rem]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {wedding.quoteText}
              </blockquote>
              {wedding.quoteSource && (
                <div className="mt-8 flex items-center gap-3">
                  <span className="h-px w-8 bg-primary/30" aria-hidden />
                  <p
                    className="text-[11px] tracking-[0.32em] uppercase text-primary/85"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {wedding.quoteSource}
                  </p>
                </div>
              )}
            </ScrollReveal>
          </div>
        </section>
      )}
      </div>

      {/* ─── WHEN & WHERE — stone band ───────────────────── */}
      <section
        id="when-where"
        ref={whenWhereSectionRef}
        className={cn(
          "border-t border-border px-6 py-28 md:py-36",
          wedding.quoteText ? "bg-secondary/25" : "bg-background",
        )}
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-2 md:items-stretch">
          {/* ─── WHEN sector ───────────────────────────────── */}
          <div
            ref={whenColumnRef}
            className="relative border-b border-border/60 pb-16 pr-8 md:border-b-0 md:border-r md:border-border/60 md:pr-12 md:pb-0"
          >
            <div className="flex items-center gap-3">
              <span className="h-px w-5 bg-primary/30" aria-hidden />
              <p
                className="text-[14px] font-medium tracking-[0.28em] uppercase text-primary"
                style={{ fontFamily: "var(--font-playfair)" }}
              >When</p>
            </div>
            {/* Tree layout: central timeline, events alternate left and right */}
            <div className="relative mt-10 min-h-[480px]">
              <div className="absolute left-1/2 top-0 h-full w-20 -translate-x-1/2 text-primary">
                <svg
                  className="h-full w-full"
                  viewBox="0 0 80 480"
                  aria-hidden
                >
                  {/* Smooth S-curve: cubic bezier, wide swing, passes through every event node */}
                  <path
                    ref={whenWherePathRef}
                    d="M 40 4 C 76 4 76 56 40 56 C 4 56 4 152 40 152 C 76 152 76 248 40 248 C 4 248 4 344 40 344 C 76 344 76 440 40 440 C 4 440 4 476 40 476"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.6"
                  />
                  {[56, 152, 248, 344, 440].map((cy) => (
                    <circle
                      key={cy}
                      cx="40"
                      cy={cy}
                      r="2.5"
                      fill="currentColor"
                      opacity="0.5"
                    />
                  ))}

                  {/* Scroll-driven marker — cx/cy set directly by getPointAtLength */}
                  <circle
                    ref={whenWhereMarkerRef}
                    cx="40"
                    cy="4"
                    r="5"
                    fill="var(--primary)"
                    stroke="var(--background)"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
              <ul className="grid grid-cols-[1fr_80px_1fr] grid-rows-5 gap-x-4 items-center">
                {scheduleEvents.map((event, i) => (
                  <li
                    key={event.id}
                    className="contents"
                  >
                    {i % 2 === 1 ? (
                      <div className="flex min-h-[96px] flex-col justify-center text-right">
                        <span
                          className="text-[1.35rem] font-normal leading-snug text-foreground sm:text-[1.45rem]"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {event.title}
                        </span>
                        <span className="mt-1.5 text-[13px] tracking-wide text-muted-foreground/90">
                          {formatEventTime(event.startTime, event.endTime)}
                        </span>
                        {event.location && (
                          <span className="mt-0.5 text-[13px] text-muted-foreground">
                            {event.location}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="flex min-h-[96px] items-center" aria-hidden />
                    {i % 2 === 0 ? (
                      <div className="flex min-h-[96px] flex-col justify-center text-left">
                        <span
                          className="text-[1.35rem] font-normal leading-snug text-foreground sm:text-[1.45rem]"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {event.title}
                        </span>
                        <span className="mt-1.5 text-[13px] tracking-wide text-muted-foreground/90">
                          {formatEventTime(event.startTime, event.endTime)}
                        </span>
                        {event.location && (
                          <span className="mt-0.5 text-[13px] text-muted-foreground">
                            {event.location}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ─── WHERE sector ────────────────────────────────── */}
          <div className="flex h-full flex-col pl-0 pt-16 md:pl-12 md:pt-0">
            <div className="flex items-center gap-3">
              <span className="h-px w-5 bg-primary/30" aria-hidden />
              <p
                className="text-[14px] font-medium tracking-[0.28em] uppercase text-primary"
                style={{ fontFamily: "var(--font-playfair)" }}
              >Where</p>
            </div>

            {/* Venue card — header: Venue | Gallery · footer: Location | Book */}
            <Tabs
              defaultValue="venue"
              className="mt-7 flex flex-1 flex-col overflow-hidden border border-border bg-background"
            >
              <TabsList
                className="grid h-auto w-full shrink-0 grid-cols-2 gap-0 rounded-none border-b border-border/80 bg-transparent p-0"
                aria-label="Venue and gallery"
              >
                <TabsTrigger
                  value="venue"
                  className={cn(
                    "rounded-none border-0 border-r border-border/70 bg-transparent py-3.5 text-[11px] font-medium tracking-[0.22em] uppercase shadow-none transition-colors",
                    "text-primary/70 data-[state=active]:bg-primary/[0.06] data-[state=active]:text-primary",
                  )}
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Venue
                </TabsTrigger>
                <TabsTrigger
                  value="gallery"
                  className={cn(
                    "rounded-none border-0 bg-transparent py-3.5 text-[11px] font-medium tracking-[0.22em] uppercase shadow-none transition-colors",
                    "text-primary/70 data-[state=active]:bg-primary/[0.06] data-[state=active]:text-primary",
                  )}
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Gallery
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="venue"
                className="m-0 flex flex-1 flex-col outline-none data-[state=inactive]:hidden"
              >
                <div className="flex flex-1 flex-col px-6 pt-6 pb-6">
                  <p
                    className="text-[2.05rem] font-normal leading-[1.15] text-foreground sm:text-[2.3rem]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {wedding.venueName}
                  </p>
                  {wedding.venueAddress ? (
                    <p className="mt-2.5 max-w-md text-[12px] font-light leading-relaxed text-muted-foreground/90">
                      {wedding.venueAddress}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setVenueLightboxIndex(0)}
                    className="group relative mt-6 aspect-[16/11] w-full min-h-[200px] cursor-zoom-in overflow-hidden bg-muted text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary sm:aspect-[16/10] sm:min-h-[240px]"
                    aria-label={`Enlarge photo: ${VENUE_HERO.alt}`}
                  >
                    <Image
                      src={VENUE_HERO.src}
                      alt={VENUE_HERO.alt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, 420px"
                    />
                  </button>
                </div>
              </TabsContent>

              <TabsContent
                value="gallery"
                className="m-0 flex flex-1 flex-col outline-none data-[state=inactive]:hidden"
              >
                <div className="flex flex-1 flex-col px-6 pt-6 pb-6">
                  <p
                    className="text-[11px] font-medium tracking-[0.3em] uppercase text-primary/80"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Stay on-site
                  </p>
                  <p
                    className="mt-3 text-[1.55rem] font-light leading-snug text-foreground sm:text-[1.7rem]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    Rooms &amp; residences at the venue
                  </p>
                  <div className="mt-6 max-h-[min(380px,48vh)] flex-1 overflow-y-auto pr-1 sm:max-h-[min(440px,46vh)] md:max-h-none md:overflow-visible">
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                      {VENUE_GALLERY_IMAGES.map((item, index) => (
                        <button
                          key={item.src}
                          type="button"
                          onClick={() => setVenueLightboxIndex(index)}
                          className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden bg-muted p-0 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Enlarge photo: ${item.alt}`}
                        >
                          <Image
                            src={item.src}
                            alt={item.alt}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 280px"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <div
                className="grid shrink-0 grid-cols-2 border-t border-border/80"
                role="presentation"
              >
                <a
                  href={venueMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "border-r border-border/70 py-3.5 text-center text-[11px] font-medium tracking-[0.22em] uppercase text-primary/85 transition-colors hover:bg-muted/40 hover:text-primary",
                  )}
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Location
                </a>
                <a
                  href={venueBookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Book — 5% off for guests"
                  className={cn(
                    "flex items-center justify-center gap-2 py-3.5 text-[11px] font-medium tracking-[0.22em] uppercase text-primary/85 transition-colors hover:bg-muted/40 hover:text-primary",
                  )}
                >
                  <span style={{ fontFamily: "var(--font-playfair)" }}>Book</span>
                  <span
                    className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[8px] font-semibold tracking-[0.12em] text-primary"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    5% off
                  </span>
                </a>
              </div>
            </Tabs>
          </div>
        </div>
      </section>

      {/* ─── RSVP ──────────────────────────────────────────── */}
      <section
        id="rsvp-section"
        className="border-t border-border bg-background px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
            {/* Left — invitation context */}
            <ScrollReveal>
              <div className="border-b border-border/60 pb-14 md:border-b-0 md:border-r md:pb-0 md:pr-14 lg:pr-20">
                <div className="flex items-center gap-3">
                  <span className="h-px w-5 bg-chart-5/40" aria-hidden />
                  <p
                    className="text-[14px] font-medium tracking-[0.28em] uppercase text-chart-5"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    R · S · V · P
                  </p>
                </div>

                <p
                  className="mt-6 text-[2.25rem] font-normal leading-[1.4] text-foreground sm:text-[2.65rem]"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {landing.rsvpHeadline.split("\n").map((line, lineIdx) => (
                    <Fragment key={lineIdx}>
                      {lineIdx > 0 ? <br /> : null}
                      {line}
                    </Fragment>
                  ))}
                </p>

                {landing.rsvpBody?.trim() ? (
                  <p className="mt-5 max-w-md text-[14px] font-light leading-[1.75] text-muted-foreground">
                    {landing.rsvpBody.split("\n").map((line, idx) => (
                      <Fragment key={idx}>
                        {idx > 0 ? <br /> : null}
                        {line}
                      </Fragment>
                    ))}
                  </p>
                ) : null}

                <div className="mt-10 space-y-6 border-t border-border/60 pt-10">
                  {/* Date & venue — highlighted */}
                  <div className="border border-chart-5/30 bg-gradient-to-b from-chart-5/[0.09] to-chart-5/[0.03] px-6 py-7 shadow-sm md:px-8 md:py-8">
                    <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
                      <div>
                        <p
                          className="text-[13px] font-semibold tracking-[0.32em] text-chart-5"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          Date
                        </p>
                        <p
                          className="mt-4 text-[1.55rem] font-normal leading-snug text-foreground sm:text-[1.75rem]"
                          style={{ fontFamily: "var(--font-cormorant)" }}
                        >
                          {formattedDate}
                        </p>
                      </div>
                      {wedding.venueName ? (
                        <div>
                          <p
                            className="text-[13px] font-semibold tracking-[0.32em] text-chart-5"
                            style={{ fontFamily: "var(--font-playfair)" }}
                          >
                            Venue
                          </p>
                          <p
                            className="mt-4 text-[1.55rem] font-normal leading-snug text-foreground sm:text-[1.75rem]"
                            style={{ fontFamily: "var(--font-cormorant)" }}
                          >
                            {wedding.venueName}
                          </p>
                          {wedding.venueAddress ? (
                            <p className="mt-3 text-[13px] font-light leading-relaxed text-muted-foreground">
                              {wedding.venueAddress}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Guest capacity & party limit */}
                  <div className="border border-border/80 bg-secondary/25 px-6 py-6 md:px-7 md:py-7">
                    <p
                      className="text-[12px] font-medium tracking-[0.3em] uppercase text-primary/90"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      Kindly note
                    </p>
                    <ul className="mt-5 list-none space-y-4 text-[13px] font-light leading-[1.75] text-muted-foreground">
                      <li className="flex gap-3">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5/70"
                          aria-hidden
                        />
                        <span>
                          <span className="font-medium text-foreground">Party size:</span> max{" "}
                          <span className="font-medium text-foreground">2 guests</span> per
                          invitation (you + 1 guest).
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5/70"
                          aria-hidden
                        />
                        <span>
                          <span className="font-medium text-foreground">Venue capacity:</span>{" "}
                          limited to{" "}
                          <span className="font-medium text-foreground">60 guests</span> total.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right — form */}
            <ScrollReveal>
              <div className="pt-14 md:pl-14 md:pt-0 lg:pl-20">
                <RsvpForm
                  weddingSlug={wedding.slug}
                  groomName={wedding.groomName}
                  brideName={wedding.brideName}
                  bankName={wedding.bankName ?? undefined}
                  bankAccount={wedding.bankAccount ?? undefined}
                  bankHolder={wedding.bankHolder ?? undefined}
                  giftInfo={wedding.giftInfo ?? undefined}
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── STAY + FOOTER — single footer illustration (no double art) ───── */}
      <div className="landing-footer-deco border-t border-border">
      <section
        id="accommodation"
        className="px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p
              className="text-[14px] font-medium tracking-[0.28em] uppercase text-primary"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {landing.stayTitle}
            </p>
            <p className="mt-3 text-[15px] font-light leading-relaxed text-muted-foreground/95">
              {landing.staySubtitle}
            </p>
          </ScrollReveal>

          {accommodationGroups.length > 0 ? (
            <Tabs defaultValue={accommodationGroups[0]!.key} className="mt-12">
              <TabsList
                className={cn(
                  "grid h-auto w-full gap-0 rounded-none border border-border/80 bg-transparent p-0",
                )}
                style={{
                  gridTemplateColumns: `repeat(${accommodationGroups.length}, minmax(0, 1fr))`,
                }}
                aria-label="Stay categories by star rating"
              >
                {accommodationGroups.map((group, idx) => (
                  <TabsTrigger
                    key={group.key}
                    value={group.key}
                    className={cn(
                      "rounded-none border-0 bg-transparent py-3.5 text-[11px] font-medium tracking-[0.22em] uppercase shadow-none transition-colors",
                      idx < accommodationGroups.length - 1 ? "border-r border-border/70" : "",
                      "text-primary/70 data-[state=active]:bg-primary/[0.06] data-[state=active]:text-primary",
                    )}
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {group.tabLabel}
                  </TabsTrigger>
                ))}
              </TabsList>

              {accommodationGroups.map((group) => (
                <TabsContent
                  key={group.key}
                  value={group.key}
                  className="m-0 data-[state=inactive]:hidden"
                >
                  <div
                    className={cn(
                      "grid grid-cols-1 gap-px border-x border-b border-border bg-border",
                      group.hotels.length === 1 ? "sm:grid-cols-1" : "",
                      group.hotels.length === 2 ? "sm:grid-cols-2" : "",
                      group.hotels.length >= 3 ? "sm:grid-cols-3" : "",
                    )}
                  >
                    {group.hotels.map((hotel, hotelIdx) => (
                      <ScrollReveal key={`${hotel.name}-${hotelIdx}`}>
                        <div className="flex h-full flex-col bg-background p-8 transition-colors duration-300 hover:bg-secondary/20">
                          <p
                            className="text-[11px] tracking-[0.3em] uppercase text-primary/90"
                            style={{ fontFamily: "var(--font-playfair)" }}
                          >
                            {hotel.category || group.label}
                          </p>
                          <p
                            className="mt-4 text-[1.65rem] font-normal leading-tight text-foreground sm:text-[1.85rem]"
                            style={{ fontFamily: "var(--font-playfair)" }}
                          >
                            {hotel.name}
                          </p>
                          <p className="mt-4 flex-1 text-sm font-light leading-relaxed text-muted-foreground">
                            {hotel.description}
                          </p>
                          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                            <span className="text-[11px] tracking-wide text-muted-foreground/60">
                              {hotel.distance}
                            </span>
                            {hotel.bookingUrl ? (
                              <a
                                href={hotel.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-primary px-5 py-1.5 text-[10px] tracking-[0.22em] uppercase text-primary transition-colors duration-300 hover:text-primary-foreground"
                                style={{ fontFamily: "var(--font-playfair)" }}
                              >
                                <span
                                  className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
                                  aria-hidden
                                />
                                <span className="relative flex items-center gap-1.5">
                                  Book
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                              </a>
                            ) : (
                              <span
                                className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40"
                                style={{ fontFamily: "var(--font-playfair)" }}
                              >
                                No booking link
                              </span>
                            )}
                          </div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : null}
        </div>
      </section>

      <footer
        id="landing-footer"
        className="relative overflow-hidden px-6 pb-16 pt-8 text-center text-foreground md:min-h-[24rem] md:pb-28 md:pt-12"
        style={{ borderTop: "1px solid rgba(37,45,24,0.08)" }}
      >
        <ScrollReveal>
          {/* Countdown to the wedding day */}
          <div className="mx-auto mb-10 max-w-sm">
            <Countdown targetDate={wedding.eventDate} variant="footer" />
          </div>

          <p
            className="mt-8 text-[1.95rem] font-light leading-[1.1] tracking-[0.04em] text-foreground sm:text-[2.2rem]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {wedding.groomName}
            {" "}
            <span
              className="font-light text-foreground/45"
              style={{ letterSpacing: "0.08em" }}
            >
              &amp;
            </span>
            {" "}
            {wedding.brideName}
          </p>

          <a
            href="/admin/login"
            className="mt-10 inline-block text-[9px] tracking-[0.22em] uppercase text-foreground/30 transition-colors hover:text-foreground/55"
          >
            Sign in
          </a>
        </ScrollReveal>
      </footer>

      <Dialog
        open={venueLightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) setVenueLightboxIndex(null);
        }}
      >
        <DialogContent
          overlayClassName="bg-background/18 backdrop-blur-[3px] backdrop-saturate-[1.08] dark:bg-background/22"
          className={cn(
            "w-fit max-w-[min(96vw,1200px)] gap-0 overflow-visible border border-white/35 bg-white/14 p-1 shadow-[0_4px_24px_-4px_rgba(43,50,16,0.09)] backdrop-blur-[3px] backdrop-saturate-[1.08] dark:border-white/12 dark:bg-white/[0.08] dark:shadow-[0_4px_22px_-4px_rgba(0,0,0,0.2)]",
            "sm:max-w-[min(96vw,1200px)]",
            "[&>button]:text-foreground/90 [&>button]:hover:bg-foreground/10 [&>button]:hover:text-foreground",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {venueLightboxItem ? (
            <>
              <DialogTitle className="sr-only">{venueLightboxItem.alt}</DialogTitle>
              <div className="relative flex w-fit max-w-[min(96vw,1200px)] items-center justify-center">
                {/* Native img so the dialog hugs each photo's intrinsic aspect & height (capped). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={venueLightboxItem.src}
                  alt={venueLightboxItem.alt}
                  className="block max-h-[min(85vh,calc(100vh-4rem))] w-auto max-w-[min(96vw,1200px)] object-contain"
                  draggable={false}
                />
                {VENUE_GALLERY_IMAGES.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVenueLightboxIndex((i) =>
                          i === null || i === 0
                            ? VENUE_GALLERY_IMAGES.length - 1
                            : i - 1,
                        );
                      }}
                      className="absolute left-2 top-1/2 z-[102] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/30 text-foreground shadow-md backdrop-blur-[3px] backdrop-saturate-[1.08] transition-colors hover:bg-white/45 dark:border-white/20 dark:bg-white/12 dark:hover:bg-white/22"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVenueLightboxIndex((i) =>
                          i === null || i >= VENUE_GALLERY_IMAGES.length - 1
                            ? 0
                            : i + 1,
                        );
                      }}
                      className="absolute right-2 top-1/2 z-[102] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/30 text-foreground shadow-md backdrop-blur-[3px] backdrop-saturate-[1.08] transition-colors hover:bg-white/45 dark:border-white/20 dark:bg-white/12 dark:hover:bg-white/22"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}
