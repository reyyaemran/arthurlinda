"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Montserrat } from "next/font/google";
import type { PublicWeddingPayload } from "@/lib/wedding/queries";
import { storySlideImageUrl } from "@/lib/wedding/landing-content";
import { Countdown } from "@/landing/components/countdown";
import { RsvpForm } from "@/landing/components/rsvp-form";
import { ScrollReveal } from "@/landing/components/scroll-reveal";
import Image from "next/image";
import { MapPin, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

const montserrat = Montserrat({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-template2-sans",
});

/** Placeholder images for template 2 — story copy comes from wedding settings. */
const STORY_PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1529634800354-3d3c9895b952?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1478146896981-b80fe4633303?w=600&h=400&fit=crop",
];

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export function Template2Landing({ data }: { data: PublicWeddingPayload }) {
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroChevronRef = useRef<HTMLDivElement>(null);
  const storySectionRef = useRef<HTMLElement>(null);
  const storyViewportRef = useRef<HTMLDivElement>(null);
  const storyTrackRef = useRef<HTMLDivElement>(null);
  const whenWhereMarkerRef = useRef<HTMLDivElement>(null);
  const whenWherePathRef = useRef<SVGPathElement>(null);
  const whenColumnRef = useRef<HTMLDivElement>(null);
  const wedding = data;
  const landing = wedding.landing;
  const scheduleEvents = data.events;
  const eventDate = new Date(wedding.eventDate);
  const formattedDate = eventDate.toLocaleDateString("en-MY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scrollToRsvp = () => {
    document.getElementById("rsvp-section")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const content = heroContentRef.current;
    const chevron = heroChevronRef.current;
    if (!content) return;
    const children = content.querySelectorAll(".hero-anim");
    gsap.set(children, { y: 32, opacity: 0 });
    if (chevron) gsap.set(chevron, { opacity: 0, y: 12 });
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(children, { y: 0, opacity: 1, duration: 0.9, stagger: 0.14 });
    if (chevron) {
      tl.to(chevron, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3");
      tl.to(chevron, { y: 6, duration: 1.2, repeat: -1, yoyo: true, ease: "sine.inOut" }, "+=0.5");
    }
    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    const section = storySectionRef.current;
    const viewport = storyViewportRef.current;
    const track = storyTrackRef.current;
    if (!section || !viewport || !track) return;
    const firstCard = track.firstElementChild as HTMLElement;
    const lastCard = track.lastElementChild as HTMLElement;
    if (!firstCard || !lastCard) return;
    const getXStart = () => {
      const V = viewport.offsetWidth;
      return V / 2 - (firstCard.offsetLeft + firstCard.offsetWidth / 2);
    };
    const getXEnd = () => {
      const V = viewport.offsetWidth;
      return V / 2 - (lastCard.offsetLeft + lastCard.offsetWidth / 2);
    };
    gsap.set(track, { x: getXStart() });
    const anim = gsap.to(track, {
      x: getXEnd,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  useEffect(() => {
    const marker = whenWhereMarkerRef.current;
    const whenCol = whenColumnRef.current;
    const pathEl = whenWherePathRef.current;
    if (!marker || !whenCol || !pathEl) return;
    gsap.set(marker, { clearProps: "transform" });
    const anim = gsap.to(marker, {
      motionPath: { path: pathEl, align: pathEl, alignOrigin: [0.5, 0.5], start: 0, end: 1 },
      ease: "none",
      scrollTrigger: { trigger: whenCol, start: "top 70%", end: "bottom 30%", scrub: 1, invalidateOnRefresh: true },
    });
    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  const accent = "#F69D9A";
  const bg = "#EFEBDE";
  const text = "#502F41";
  const muted = "#502F41b3";
  const border = "#EAD1AA";

  return (
    <div className={`template2-theme ${montserrat.variable}`}>
      <div
        className="min-h-screen"
        style={{ fontFamily: "var(--font-template2-sans), var(--font-sans)", background: bg, color: text }}
      >
        <section className="flex min-h-screen flex-col items-center justify-center px-6">
          <div ref={heroContentRef} className="mx-auto max-w-xl text-center">
            <p className="hero-anim text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>
              We are getting married
            </p>
            <h1
              className="hero-anim mt-4 text-4xl font-normal tracking-tight sm:text-5xl md:text-6xl"
              style={{ fontFamily: "var(--font-template2-serif)" }}
            >
              {wedding.groomName}
              <br />
              <span style={{ color: accent }}>&</span>
              <br />
              {wedding.brideName}
            </h1>
            <p className="hero-anim mt-8 text-sm" style={{ color: muted }}>
              {formattedDate}
            </p>
            <div className="hero-anim mt-12">
              <Countdown targetDate={wedding.eventDate} />
            </div>
            <button
              type="button"
              onClick={scrollToRsvp}
              className="hero-anim mt-16 inline-block border-b pb-1 text-sm tracking-wide transition-opacity hover:opacity-80"
              style={{ borderColor: accent, color: accent }}
            >
              We would love for you to be there
            </button>
          </div>
          <div ref={heroChevronRef} className="absolute bottom-8" style={{ color: accent }}>
            <ChevronDown className="h-5 w-5" />
          </div>
        </section>

        <section ref={storySectionRef} className="border-t py-24 md:py-32" style={{ borderColor: border }}>
          <div className="mb-10 px-6">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
                {landing.storySectionLabel}
              </p>
            </ScrollReveal>
          </div>
          <div className="relative w-full overflow-hidden">
            <div ref={storyViewportRef} className="our-story-gallery w-full overflow-x-hidden overflow-y-hidden pb-6 pt-2">
              <div ref={storyTrackRef} className="flex w-max gap-6 px-6 md:gap-10 md:px-10">
                {landing.storySlides.map((slide, i) => (
                  <article
                    key={i}
                    className="our-story-card flex w-[85vw] shrink-0 flex-col overflow-hidden rounded-xl border shadow-md md:w-[420px]"
                    style={{ borderColor: border, backgroundColor: bg }}
                  >
                    {(() => {
                      const storyImgSrc =
                        storySlideImageUrl(slide) ??
                        STORY_PLACEHOLDER_IMAGES[i % STORY_PLACEHOLDER_IMAGES.length] ??
                        STORY_PLACEHOLDER_IMAGES[0]!;
                      return (
                        <div className="photo-grain relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: border }}>
                          <Image
                            src={storyImgSrc}
                            alt=""
                            fill
                            aria-hidden
                            className="photo-vintage-bw object-cover scale-105 blur-md saturate-150 opacity-95"
                            sizes="(max-width: 768px) 85vw, 420px"
                          />
                          <Image
                            src={storyImgSrc}
                            alt=""
                            fill
                            className="photo-vintage-bw object-contain"
                            sizes="(max-width: 768px) 85vw, 420px"
                          />
                        </div>
                      );
                    })()}
                    <div className="flex flex-1 flex-col px-6 py-6 md:px-8 md:py-8">
                      <span className="mb-2 block text-xs font-medium uppercase tracking-widest" style={{ color: accent }}>
                        {slide.title}
                      </span>
                      <p
                        className="text-base leading-relaxed md:text-lg"
                        style={{ fontFamily: "var(--font-template2-serif)", color: text, opacity: 0.9 }}
                      >
                        {slide.text}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs" style={{ color: muted }}>
            Scroll to read our story
          </p>
        </section>

        {wedding.quoteText && (
          <section className="border-t px-6 py-24 md:py-32" style={{ borderColor: border }}>
            <div className="mx-auto max-w-xl">
              <ScrollReveal>
                <blockquote
                  className="text-xl leading-relaxed sm:text-2xl"
                  style={{ fontFamily: "var(--font-template2-serif)", color: text, opacity: 0.85 }}
                >
                  &ldquo;{wedding.quoteText}&rdquo;
                </blockquote>
                {wedding.quoteSource && (
                  <p className="mt-6 text-xs font-medium uppercase tracking-widest" style={{ color: accent }}>
                    — {wedding.quoteSource}
                  </p>
                )}
              </ScrollReveal>
            </div>
          </section>
        )}

        <section className="border-t px-6 py-24 md:py-32" style={{ borderColor: border }}>
          <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
            <div
              ref={whenColumnRef}
              className="relative border-b pb-16 pr-8 md:border-b-0 md:border-r md:pr-12 md:pb-0"
              style={{ borderColor: border }}
            >
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
                When
              </p>
              <div className="relative mt-10 min-h-[480px]">
                <div className="absolute left-1/2 top-0 h-full w-12 -translate-x-1/2">
                  <svg className="h-full w-full" viewBox="0 0 80 480" aria-hidden>
                    <path
                      ref={whenWherePathRef}
                      d="M 40 16 Q 68 36 40 56 Q 12 104 40 152 Q 68 200 40 248 Q 12 296 40 344 Q 68 392 40 440 Q 12 452 40 464"
                      fill="none"
                      stroke={accent}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {[56, 152, 248, 344, 440].map((cy) => (
                      <circle key={cy} cx="40" cy={cy} r="4" fill="none" stroke={accent} strokeWidth="1.5" />
                    ))}
                  </svg>
                  <div
                    ref={whenWhereMarkerRef}
                    className="absolute left-1/2 top-0 z-10 h-3 w-3 -translate-x-1/2 shrink-0 rounded-full ring-2"
                    style={{ background: accent, borderColor: bg, boxShadow: `0 0 0 2px ${bg}` }}
                  />
                </div>
                <ul className="grid grid-cols-[1fr_48px_1fr] grid-rows-5 items-center gap-x-4">
                  {scheduleEvents.map((event, i) => (
                    <li key={event.id} className="contents">
                      {i % 2 === 1 ? (
                        <div className="flex min-h-[96px] flex-col justify-center text-right">
                          <span
                            className="text-base font-medium sm:text-lg"
                            style={{ fontFamily: "var(--font-template2-serif)", color: text }}
                          >
                            {event.title}
                          </span>
                          <span className="mt-1 text-sm" style={{ color: muted }}>
                            {new Date(event.startTime).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                            {event.endTime &&
                              ` – ${new Date(event.endTime).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                          {event.location && (
                            <span className="mt-0.5 text-sm" style={{ color: muted, opacity: 0.9 }}>
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
                            className="text-base font-medium sm:text-lg"
                            style={{ fontFamily: "var(--font-template2-serif)", color: text }}
                          >
                            {event.title}
                          </span>
                          <span className="mt-1 text-sm" style={{ color: muted }}>
                            {new Date(event.startTime).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                            {event.endTime &&
                              ` – ${new Date(event.endTime).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                          {event.location && (
                            <span className="mt-0.5 text-sm" style={{ color: muted, opacity: 0.9 }}>
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

            <div className="flex flex-col pl-0 pt-16 md:pl-12 md:pt-0">
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
                Where
              </p>
              <ul className="mt-6 space-y-6">
                <li>
                  <p className="text-lg font-normal" style={{ fontFamily: "var(--font-template2-serif)", color: text }}>
                    {wedding.venueName}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: muted }}>
                    {wedding.venueAddress}
                  </p>
                  {wedding.venueMapUrl && (
                    <a
                      href={wedding.venueMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm underline underline-offset-2 transition-opacity hover:opacity-80"
                      style={{ color: accent }}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Open in Google Maps
                    </a>
                  )}
                </li>
              </ul>
              <div
                className="relative mt-8 h-64 w-full min-h-[240px] flex-1 overflow-hidden rounded-lg md:h-72 lg:h-80"
                style={{
                  background: bg,
                  filter: "saturate(0.38) sepia(0.22) hue-rotate(348deg) brightness(1.06) contrast(1)",
                }}
              >
                <iframe
                  title="Venue location"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    [wedding.venueName, wedding.venueAddress].filter(Boolean).join(", ")
                  )}&z=14&output=embed`}
                  className="absolute inset-0 h-full w-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="rsvp-section" className="border-t px-6 py-24 md:py-32" style={{ borderColor: border }}>
          <div className="mx-auto max-w-md">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
                R.S.V.P.
              </p>
              <div className="mt-10">
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
        </section>

        {wedding.giftInfo && (
          <section className="border-t px-6 py-24 md:py-32" style={{ borderColor: border }}>
            <div className="mx-auto max-w-xl">
              <ScrollReveal>
                <p className="text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
                  Gift
                </p>
                <p className="mt-6" style={{ color: text, opacity: 0.8 }}>
                  {wedding.giftInfo}
                </p>
                {wedding.bankName && (
                  <div className="mt-8 space-y-1">
                    <p className="text-sm font-medium" style={{ color: text }}>
                      {wedding.bankName}
                    </p>
                    <p className="font-mono" style={{ color: text }}>
                      {wedding.bankAccount}
                    </p>
                    <p className="text-sm" style={{ color: muted }}>
                      {wedding.bankHolder}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 h-auto gap-1.5 px-0 text-sm transition-colors hover:bg-transparent"
                      style={{ color: accent }}
                      onClick={() => wedding.bankAccount && navigator.clipboard.writeText(wedding.bankAccount)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy account number
                    </Button>
                  </div>
                )}
              </ScrollReveal>
            </div>
          </section>
        )}

        <footer
          className="landing-footer-deco relative overflow-hidden border-t px-6 py-12 text-center md:min-h-[22rem] md:py-16"
          style={{
            borderColor: border,
            backgroundColor: "#f5f1e8",
          }}
        >
          <ScrollReveal>
            <p className="text-xl font-normal" style={{ fontFamily: "var(--font-template2-serif)", color: accent }}>
              {wedding.groomName} & {wedding.brideName}
            </p>
            <p className="mt-2 text-xs" style={{ color: muted }}>
              {formattedDate}
            </p>
          </ScrollReveal>
        </footer>
      </div>
    </div>
  );
}
