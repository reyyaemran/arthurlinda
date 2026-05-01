"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type PhotoVm = { id: string; url: string; createdAt: string };

type Props = {
  token: string;
  label: string;
  maxPhotos: number;
  filterMode: "VINTAGE" | "ORIGINAL";
  initialPhotoCount: number;
  weddingNames: string;
  eventDateIso: string;
  initialPhotos: PhotoVm[];
};

function formatMomentsLabel(rawLabel: string) {
  const trimmed = rawLabel.trim();
  if (/^moments of\s+/i.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^table\s*/i, "").trim();
  return `Moments of ${normalized || "01"}`;
}

function makeTempId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatFrameDate(eventDateIso: string) {
  const d = new Date(eventDateIso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatKodakTimestamp(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd} ${mm} '${yy}  ${hh}:${min}`;
}

async function processCapturedPhoto(
  file: File,
  options: { applyVintage: boolean; weddingNames: string; eventDateIso: string },
): Promise<File> {
  const img = new Image();
  const src = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
  URL.revokeObjectURL(src);

  const maxEdge = 1800;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // Base grade (optional vintage B&W).
  ctx.filter = options.applyVintage
    ? "grayscale(1) contrast(1.08) brightness(1.02)"
    : "contrast(1.01) brightness(1.01)";
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";

  if (options.applyVintage) {
    // Film grain + subtle fade + vignette for analog look.
    const data = ctx.getImageData(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let i = 0; i < data.data.length; i += 4) {
      const p = i / 4;
      const x = p % w;
      const y = Math.floor(p / w);
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;

      const grain = (Math.random() - 0.5) * 28;

      const r0 = data.data[i];
      const g0 = data.data[i + 1];
      const b0 = data.data[i + 2];
      const lum = (r0 * 0.2126 + g0 * 0.7152 + b0 * 0.0722) / 255;

      // Lift blacks slightly and compress highlights a touch.
      const lift = 9 + (1 - lum) * 5;
      const rolloff = lum * 4;

      // vignette: darken edges softly
      const vignette = 1 - Math.max(0, dist - 0.22) * 0.38;

      const mono = (r0 + g0 + b0) / 3;
      const px = (mono + grain + lift - rolloff) * vignette;

      data.data[i] = Math.max(0, Math.min(255, px));
      data.data[i + 1] = Math.max(0, Math.min(255, px));
      data.data[i + 2] = Math.max(0, Math.min(255, px));
    }
    ctx.putImageData(data, 0, 0);

    // final softening pass to mimic disposable lens
    ctx.filter = "blur(0.45px) contrast(0.98)";
    ctx.globalAlpha = 0.16;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = "none";
  }

  // Kodak-style in-photo timestamp (yellow classic digital look).
  const shotDate = new Date(file.lastModified || Date.now());
  const kodakStamp = formatKodakTimestamp(shotDate);
  const stampSize = Math.max(18, Math.round(w * 0.038));
  const x = w - Math.max(20, Math.round(w * 0.03));
  const y = h - Math.max(20, Math.round(h * 0.04));

  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.font = `bold ${stampSize}px "Courier New", "Lucida Console", monospace`;
  // Shadow first so yellow remains readable over bright backgrounds.
  ctx.fillStyle = "rgba(32, 20, 8, 0.52)";
  ctx.fillText(kodakStamp, x + 1.5, y + 1.5);
  ctx.fillStyle = "#df7f26";
  ctx.fillText(kodakStamp, x, y);
  ctx.restore();

  // White instant-film frame with top/bottom stamps.
  const side = Math.max(18, Math.round(w * 0.045));
  const top = Math.max(24, Math.round(h * 0.09));
  const bottom = Math.max(44, Math.round(h * 0.16));
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = w + side * 2;
  frameCanvas.height = h + top + bottom;
  const frameCtx = frameCanvas.getContext("2d");
  if (!frameCtx) return file;

  frameCtx.fillStyle = "#f7f5f0";
  frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);
  frameCtx.drawImage(canvas, side, top, w, h);

  const topText = options.weddingNames.trim();
  const bottomText = formatFrameDate(options.eventDateIso);

  frameCtx.textAlign = "center";
  frameCtx.textBaseline = "middle";
  frameCtx.fillStyle = "#2a2a2a";
  frameCtx.font = `${Math.max(12, Math.round(frameCanvas.width * 0.03))}px "Times New Roman", serif`;
  frameCtx.fillText(topText, frameCanvas.width / 2, Math.round(top * 0.56));

  frameCtx.font = `${Math.max(11, Math.round(frameCanvas.width * 0.026))}px "Times New Roman", serif`;
  frameCtx.fillText(bottomText, frameCanvas.width / 2, top + h + Math.round(bottom * 0.55));

  const blob = await new Promise<Blob | null>((resolve) =>
    frameCanvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-film.jpg`, {
    type: "image/jpeg",
  });
}

export function GalleryCapturePage({
  token,
  label,
  maxPhotos,
  filterMode: initialFilterMode,
  initialPhotoCount,
  weddingNames,
  eventDateIso,
  initialPhotos,
}: Props) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [photoCount, setPhotoCount] = useState(initialPhotoCount);
  const [photos, setPhotos] = useState(initialPhotos);
  const [pendingPhotos, setPendingPhotos] = useState<
    { id: string; file: File; previewUrl: string; name: string }[]
  >([]);
  const [previewDialogUrl, setPreviewDialogUrl] = useState<string | null>(null);
  const [previewDialogName, setPreviewDialogName] = useState<string>("moment");
  const [filterMode, setFilterMode] = useState<"VINTAGE" | "ORIGINAL">(initialFilterMode);
  const refreshingRef = useRef(false);
  const momentsLabel = useMemo(() => formatMomentsLabel(label), [label]);

  const remaining = useMemo(
    () => Math.max(maxPhotos - (photoCount + pendingPhotos.length), 0),
    [maxPhotos, photoCount, pendingPhotos.length],
  );

  const refreshPhotos = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const res = await fetch(`/api/gallery/public/${token}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        roll?: { photoCount: number; filterMode?: "VINTAGE" | "ORIGINAL" };
        photos?: PhotoVm[];
      };
      if (res.ok && data.roll && data.photos) {
        setPhotoCount(data.roll.photoCount);
        if (data.roll.filterMode === "VINTAGE" || data.roll.filterMode === "ORIGINAL") {
          setFilterMode(data.roll.filterMode);
        }
        setPhotos(data.photos);
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void refreshPhotos();
      }
    };
    const id = window.setInterval(tick, 12000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshPhotos();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshPhotos]);

  const onSelect = async (files: FileList | null, input?: HTMLInputElement | null) => {
    if (!files || files.length === 0) return;
    if (remaining <= 0) {
      toast.error("This disposable camera is full");
      if (input) input.value = "";
      return;
    }
    setProcessing(true);
    try {
      const selected = Array.from(files).slice(0, remaining);
      const queue: { id: string; file: File; previewUrl: string; name: string }[] = [];
      for (const file of selected) {
        let filtered: File = file;
        try {
          filtered = await processCapturedPhoto(file, {
            applyVintage: filterMode === "VINTAGE",
            weddingNames,
            eventDateIso,
          });
        } catch {
          filtered = file;
        }
        queue.push({
          id: makeTempId(),
          file: filtered,
          previewUrl: URL.createObjectURL(filtered),
          name: filtered.name,
        });
      }
      setPendingPhotos((prev) => [...prev, ...queue]);
    } finally {
      setProcessing(false);
    }
    if (input) input.value = "";
  };

  const removePending = (id: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const uploadPending = async () => {
    if (pendingPhotos.length === 0) return;
    setUploading(true);
    try {
      for (const pending of pendingPhotos) {
        const form = new FormData();
        form.set("token", token);
        form.set("file", pending.file);
        const res = await fetch("/api/gallery/upload", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Upload failed");
      }
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingPhotos([]);
      await refreshPhotos();
      toast.success("Photos posted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload");
    } finally {
      setUploading(false);
    }
  };

  const downloadPreview = () => {
    if (!previewDialogUrl) return;
    const a = document.createElement("a");
    const base = previewDialogName.trim() || "moment";
    a.href = previewDialogUrl;
    a.download = base.includes(".") ? base : `${base}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const saveToPhonePhotos = async () => {
    if (!previewDialogUrl) return;
    const base = previewDialogName.trim() || "moment";
    const filename = base.includes(".") ? base : `${base}.jpg`;
    try {
      // Mobile-friendly path: open native share sheet, then user can tap "Save Image".
      if (typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator) {
        const res = await fetch(previewDialogUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, {
          type: blob.type || "image/jpeg",
        });
        const canShareFiles = (navigator as Navigator & {
          canShare?: (data?: ShareData) => boolean;
        }).canShare?.({ files: [file] });
        if (canShareFiles) {
          await navigator.share({
            files: [file],
            title: "Moment",
            text: "Save this photo",
          });
          return;
        }
      }
    } catch {
      // fall through to standard download
    }
    downloadPreview();
  };

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-4 py-5 text-[#1f1f1f]">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/55 [font-family:var(--font-playfair)]">
              Share your Moments here
            </p>
            <span className="text-[11px] text-black/60">{photoCount + pendingPhotos.length}/{maxPhotos}</span>
          </div>
          <h1
            className="mt-1 text-[1.5rem] leading-tight tracking-tight text-black sm:text-[1.7rem]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {momentsLabel}
          </h1>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading || processing || remaining <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-black/5 px-3 py-2.5 text-[10px] uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Camera className="h-4 w-4" />
              Take photo
            </button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            disabled={uploading || processing || remaining <= 0}
            onChange={(e) => void onSelect(e.currentTarget.files, e.currentTarget)}
          />
          <button
            type="button"
            onClick={() => void uploadPending()}
            disabled={uploading || processing || pendingPhotos.length === 0}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-black px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {processing ? "Preparing..." : uploading ? "Posting..." : `Post ${pendingPhotos.length || ""}`.trim()}
          </button>

          {pendingPhotos.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-black/50 [font-family:var(--font-playfair)]">
                Preview
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {pendingPhotos.map((photo) => (
                  <div key={photo.id} className="relative overflow-hidden rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDialogUrl(photo.previewUrl);
                        setPreviewDialogName(photo.name || "moment-preview");
                      }}
                      className="block w-full cursor-zoom-in"
                    >
                      <img src={photo.previewUrl} alt={photo.name} className="h-40 w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePending(photo.id)}
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                      aria-label="Remove selected photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-black/50 [font-family:var(--font-playfair)]">
            All Moments · Recent Uploads
          </p>
          {photos.length === 0 ? (
            <p className="mt-2 text-sm text-black/45">No photos uploaded yet.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {photos.map((photo) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => {
                    setPreviewDialogUrl(photo.url);
                    setPreviewDialogName(`moment-${photo.id}`);
                  }}
                  className="cursor-zoom-in overflow-hidden rounded-xl border border-black/10 bg-white"
                >
                  <img src={photo.url} alt="Uploaded guest photo" className="h-40 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!previewDialogUrl} onOpenChange={(open) => !open && setPreviewDialogUrl(null)}>
        <DialogContent className="max-w-3xl rounded-2xl border-black/10 bg-white">
          {previewDialogUrl ? (
            <div className="space-y-2">
              <img
                src={previewDialogUrl}
                alt="Photo preview"
                className="max-h-[72vh] w-full rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={() => void saveToPhonePhotos()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-black px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-white transition hover:bg-black/85"
              >
                <Download className="h-4 w-4" />
                Save photo
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
