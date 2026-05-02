import type { Prisma } from "@prisma/client";

export type StorySlide = { title: string; text: string; imageUrl?: string };

/** Safe public path for uploaded story art (ignore malformed values). */
export function storySlideImageUrl(slide: { imageUrl?: string }): string | undefined {
  const u = slide.imageUrl?.trim();
  if (!u) return undefined;
  if (u.startsWith("/uploads/story/")) return u;
  if (/^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(u)) return u;
  // Supabase Storage public URL.
  try {
    const url = new URL(u);
    if (url.protocol === "https:") {
      const host = url.hostname.toLowerCase();
      if (host.endsWith(".supabase.co") || host.endsWith(".supabase.in")) return u;
    }
  } catch {
    // not a valid URL — fall through
  }
  return undefined;
}

export type LandingAccommodation = {
  name: string;
  category: string;
  description: string;
  distance: string;
  bookingUrl: string;
};

/** Fully resolved landing UI copy (always defined for templates). */
export type ResolvedLandingContent = {
  heroEyebrow: string;
  storySectionLabel: string;
  storySlides: StorySlide[];
  rsvpHeadline: string;
  rsvpBody: string;
  stayTitle: string;
  staySubtitle: string;
  accommodations: LandingAccommodation[];
};

/** Partial patch stored in DB or sent from the admin form. */
export type LandingOverrides = Partial<{
  heroEyebrow: string;
  storySectionLabel: string;
  storySlides: StorySlide[];
  rsvpHeadline: string;
  rsvpBody: string;
  stayTitle: string;
  staySubtitle: string;
  accommodations: LandingAccommodation[];
}>;

export const DEFAULT_LANDING_CONTENT: ResolvedLandingContent = {
  heroEyebrow: "Cherish the Moments",
  storySectionLabel: "Our Story",
  storySlides: [
    {
      title: "How we met",
      text: "Our story began with easy laughter and long conversations — friendship first, then something steadier. We knew we wanted to build a life that felt cozy, honest, and full of light.",
    },
    {
      title: "Adventures",
      text: "We chased sunsets, shared too many meals to count, and learned how to move through the world as a team — curious, patient, and a little bit stubborn in the best way.",
    },
    {
      title: "Growing together",
      text: "Through moves, milestones, and ordinary Tuesdays, we chose each other again and again. Love, for us, looks like showing up — with warmth, humour, and room to grow.",
    },
    {
      title: "The proposal",
      text: "When the moment felt right, we said yes to forever. Grateful doesn’t begin to cover it — we’re humbled by the people who cheered us on and the path that brought us here.",
    },
    {
      title: "Siem Reap",
      text: "We’re gathering in Cambodia — among temples, water, and greenery — for a celebration that’s nature-inspired, a little whimsical, and deeply us: draped fabrics, organic greens, and room to breathe.",
    },
    {
      title: "Celebration",
      text: "Whether you’re nearby or crossing oceans — if you can be there, we’d love to celebrate with you. Your presence is the heart of our day.",
    },
  ],
  rsvpHeadline: "We would be honoured\nby your presence.",
  rsvpBody:
    "Kindly let us know if you are able to join us in celebration. Your response helps us plan the perfect day for everyone.",
  stayTitle: "Stay Nearby",
  staySubtitle: "A few places we recommend close to the venue.",
  accommodations: [
    {
      name: "Angkor Grace",
      category: "Five star resort",
      description:
        "A luxury wellness-focused resort in Siem Reap with suites, residences and retreat programs designed around rest and rejuvenation.",
      distance: "Siem Reap • near Angkor area",
      bookingUrl: "https://angkorgrace.com/",
    },
    {
      name: "Amansara",
      category: "Five star resort",
      description:
        "A refined all-suite retreat at the gateway to Angkor Wat, known for private courtyards, plunge pools and curated temple experiences.",
      distance: "Road to Angkor • ~60 min from SAI airport",
      bookingUrl: "https://www.aman.com/resorts/amansara",
    },
    {
      name: "Phum Baitang",
      category: "Five star resort",
      description:
        "A serene 'green village' set among rice paddies, featuring Khmer-inspired villas, wellness treatments and immersive cultural activities.",
      distance: "Outskirts of Siem Reap • close to Angkor",
      bookingUrl: "https://www.zannierhotels.com/hotels/phum-baitang/",
    },
    {
      name: "Lotus Blanc Resort",
      category: "Four star",
      description:
        "A tranquil coconut-garden resort on Road 6 with spacious rooms, a large pool and easy access to downtown and Angkor attractions.",
      distance: "Road 6, Siem Reap • short ride to center",
      bookingUrl: "https://www.lotusblancresort.com/",
    },
    {
      name: "Viroth's Villa",
      category: "Four star",
      description:
        "A stylish 19-room boutique stay offering poolside dining, spa treatments and calm leafy surroundings near key Siem Reap sights.",
      distance: "Siem Reap • near temple tour routes",
      bookingUrl: "https://www.viroth-villa.com/",
    },
    {
      name: "The Aviary Hotel",
      category: "Four star",
      description:
        "An eco-conscious 43-room urban oasis in central Siem Reap, inspired by Cambodian birdlife and local artisan craftsmanship.",
      distance: "City center • ~10 min to Angkor Park",
      bookingUrl: "https://theaviaryhotel.com/",
    },
    {
      name: "Babel Siem Reap",
      category: "Three star",
      description:
        "A sustainable guesthouse and boutique concept focused on responsible tourism, local community support and low-impact travel.",
      distance: "Siem Reap • community-focused location",
      bookingUrl: "https://www.babelsiemreap.com/",
    },
    {
      name: "Le Chanthou",
      category: "Three star",
      description:
        "A countryside-inspired boutique retreat with pool-view villas, a quiet atmosphere and convenient access to temples and town.",
      distance: "Siem Reap • ~5 min tuk tuk to town center",
      bookingUrl: "https://lechanthou.com/",
    },
    {
      name: "The Community Travel",
      category: "Three star",
      description:
        "A purpose-driven stay and travel hub where bookings support local families, crafts and community-led experiences in Cambodia.",
      distance: "Preah Sihanouk Ave • near museum & palace",
      bookingUrl: "https://www.thecommunitytravel.com/",
    },
  ],
};

function isStorySlide(v: unknown): v is StorySlide {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.title !== "string" || typeof o.text !== "string") return false;
  if (o.imageUrl != null && typeof o.imageUrl !== "string") return false;
  return true;
}

function isAccommodation(v: unknown): v is LandingAccommodation {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.category === "string" &&
    typeof o.description === "string" &&
    typeof o.distance === "string" &&
    typeof o.bookingUrl === "string"
  );
}

export function parseLandingOverrides(raw: Prisma.JsonValue | null | undefined): LandingOverrides {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as LandingOverrides;
}

export function resolveLandingContent(
  raw: Prisma.JsonValue | null | undefined,
): ResolvedLandingContent {
  const o = parseLandingOverrides(raw);
  const base = DEFAULT_LANDING_CONTENT;

  const storySlides =
    Array.isArray(o.storySlides) && o.storySlides.length > 0
      ? o.storySlides.filter(isStorySlide)
      : base.storySlides;

  const accommodations = (() => {
    if (!Array.isArray(o.accommodations) || o.accommodations.length === 0) {
      return base.accommodations;
    }

    const saved = o.accommodations.filter(isAccommodation);
    if (saved.length === 0) return base.accommodations;

    // Keep admin-saved items first, then append any newly introduced defaults
    // (matched by name, case-insensitive) so legacy weddings automatically
    // receive new recommendation entries without losing custom edits.
    const seen = new Set(saved.map((h) => h.name.trim().toLowerCase()));
    const missingDefaults = base.accommodations.filter(
      (h) => !seen.has(h.name.trim().toLowerCase()),
    );
    return [...saved, ...missingDefaults];
  })();

  return {
    heroEyebrow: typeof o.heroEyebrow === "string" && o.heroEyebrow.trim() ? o.heroEyebrow.trim() : base.heroEyebrow,
    storySectionLabel:
      typeof o.storySectionLabel === "string" && o.storySectionLabel.trim()
        ? o.storySectionLabel.trim()
        : base.storySectionLabel,
    storySlides,
    rsvpHeadline:
      typeof o.rsvpHeadline === "string" && o.rsvpHeadline.trim()
        ? o.rsvpHeadline.trim()
        : base.rsvpHeadline,
    rsvpBody:
      typeof o.rsvpBody === "string" && o.rsvpBody.trim() ? o.rsvpBody.trim() : base.rsvpBody,
    stayTitle: typeof o.stayTitle === "string" && o.stayTitle.trim() ? o.stayTitle.trim() : base.stayTitle,
    staySubtitle:
      typeof o.staySubtitle === "string" && o.staySubtitle.trim()
        ? o.staySubtitle.trim()
        : base.staySubtitle,
    accommodations,
  };
}
