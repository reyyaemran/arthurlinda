"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { thumbnailUrl } from "@/lib/storage";

type PhotoVm = {
  id: string;
  url: string;
  rollLabel: string;
  createdAt: string;
};

type Props = {
  weddingNames: string;
  photos: PhotoVm[];
};

function formatMomentsLabel(rawLabel: string) {
  const trimmed = rawLabel.trim();
  if (/^moments of\s+/i.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^table\s*/i, "").trim();
  return `Moments of ${normalized || "01"}`;
}

export function GallerySharedPage({ weddingNames, photos }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const formatFilmTimestamp = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} • ${hh}:${mm}`;
  };

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-4 py-6 text-[#1f1f1f]">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-black/55 [font-family:var(--font-playfair)]">
            Moments
          </p>
          <h1
            className="mt-1 text-[1.65rem] leading-tight tracking-tight text-black sm:text-[1.9rem]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            In the Frame
          </h1>
          <p className="mt-1 text-sm text-black/55">{weddingNames}</p>
        </div>

        <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          {photos.length === 0 ? (
            <p className="text-sm text-black/50">No photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => setPreviewUrl(photo.url)}
                  className="group overflow-hidden rounded-lg border border-black/10 text-left"
                >
                  <div className="relative">
                    <img
                      src={thumbnailUrl(photo.url, { width: 480, quality: 65 })}
                      alt={`${photo.rollLabel} upload`}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-2 py-1.5 text-white">
                      <p className="truncate text-[11px] leading-tight tracking-[0.04em]" style={{ fontFamily: "var(--font-cormorant)" }}>
                        {formatMomentsLabel(photo.rollLabel)}
                      </p>
                      <p className="truncate text-[9px] uppercase tracking-[0.1em] text-white/85">
                        {formatFilmTimestamp(photo.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl rounded-2xl border-black/10 bg-white">
          {previewUrl ? (
            <img src={previewUrl} alt="Gallery preview" className="max-h-[78vh] w-full rounded-lg object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
