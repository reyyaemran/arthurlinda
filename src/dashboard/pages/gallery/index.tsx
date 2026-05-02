"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, MoreVertical, Palette, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { thumbnailUrl } from "@/lib/storage";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RollVm = {
  id: string;
  label: string;
  token: string;
  maxPhotos: number;
  filterMode: "VINTAGE" | "ORIGINAL";
  photoCount: number;
  createdAt: string;
  photos: PhotoVm[];
};

type PhotoVm = {
  id: string;
  url: string;
  createdAt: string;
};

type GalleryAdminPageProps = {
  weddingId: string;
  origin: string;
  sharedGalleryUrl: string;
  initialRolls: RollVm[];
};

function formatMomentsLabel(rawLabel: string) {
  const trimmed = rawLabel.trim();
  if (/^moments of\s+/i.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^table\s*/i, "").trim();
  return `Moments of ${normalized || "01"}`;
}

export function GalleryAdminPage({
  weddingId,
  origin,
  sharedGalleryUrl,
  initialRolls,
}: GalleryAdminPageProps) {
  const [rolls, setRolls] = useState(initialRolls);
  const [creating, setCreating] = useState(false);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [newTableLabel, setNewTableLabel] = useState("");
  const [editingRollId, setEditingRollId] = useState<string | null>(null);
  const [qrDialogRoll, setQrDialogRoll] = useState<{
    label: string;
    qrUrl: string;
    shareUrl: string;
  } | null>(null);
  const [photoDialogUrl, setPhotoDialogUrl] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [deletingRollId, setDeletingRollId] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  const sortedRolls = useMemo(
    () => [...rolls].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    [rolls],
  );

  const refreshRolls = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const res = await fetch("/api/gallery/rolls", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { rolls?: RollVm[] };
      if (res.ok && Array.isArray(data.rolls)) {
        setRolls(data.rolls);
      }
    } finally {
      refreshingRef.current = false;
    }
  };

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void refreshRolls();
      }
    };
    const id = window.setInterval(tick, 12000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshRolls();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const createRoll = async () => {
    const label = newTableLabel.trim();
    if (!label) {
      toast.error("Enter a table label");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/gallery/rolls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId, label, maxPhotos: 15, filterMode: "VINTAGE" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; roll?: RollVm };
      if (!res.ok || !data.roll) throw new Error(data.error || "Failed to create table roll");
      setRolls((prev) => [...prev, { ...data.roll!, photos: [] }]);
      toast.success("Table QR created");
      setAddTableOpen(false);
      setNewTableLabel("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const updateRoll = async (
    rollId: string,
    payload: Partial<Pick<RollVm, "label" | "filterMode">>,
  ) => {
    const res = await fetch(`/api/gallery/rolls/${rollId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; roll?: RollVm };
    if (!res.ok || !data.roll) throw new Error(data.error || "Failed to update table");
    setRolls((prev) => prev.map((r) => (r.id === rollId ? data.roll! : r)));
  };

  const saveEditTable = async () => {
    if (!editingRollId) return;
    const label = newTableLabel.trim();
    if (!label) {
      toast.error("Enter a table label");
      return;
    }
    setCreating(true);
    try {
      await updateRoll(editingRollId, { label });
      toast.success("Table updated");
      setAddTableOpen(false);
      setEditingRollId(null);
      setNewTableLabel("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setCreating(false);
    }
  };

  const deleteRoll = async (rollId: string) => {
    setDeletingRollId(rollId);
    try {
      const res = await fetch(`/api/gallery/rolls/${rollId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete table");
      setRolls((prev) => prev.filter((r) => r.id !== rollId));
      toast.success("Table deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingRollId(null);
    }
  };

  const deletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/api/gallery/photos/${photoId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete photo");
      setRolls((prev) =>
        prev.map((r) => {
          const nextPhotos = r.photos.filter((p) => p.id !== photoId);
          const deletedFromThisRoll = nextPhotos.length !== r.photos.length;
          return {
            ...r,
            photos: nextPhotos,
            photoCount: deletedFromThisRoll ? Math.max(0, r.photoCount - 1) : r.photoCount,
          };
        }),
      );
      toast.success("Photo removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1
          className="text-[1.9rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2.1rem]"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Gallery
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setQrDialogRoll({
                label: "Moments",
                qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(sharedGalleryUrl)}`,
                shareUrl: sharedGalleryUrl,
              })
            }
            className="inline-flex items-center justify-center gap-1 rounded-full border border-border/60 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <QrCode className="h-3 w-3" />
            Moments
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingRollId(null);
              setNewTableLabel("");
              setAddTableOpen(true);
            }}
            disabled={creating}
            className="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-primary text-[11px] tracking-[0.2em] uppercase text-primary transition-colors duration-300 hover:text-background disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5"
            aria-label={creating ? "Creating table" : "Add table"}
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
            />
            <span className="relative flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{creating ? "Creating" : "Add table"}</span>
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedRolls.map((roll) => {
          const momentsLabel = formatMomentsLabel(roll.label);
          const shareUrl = `${origin}/gallery/${roll.token}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(`${origin}/gallery/${roll.token}`)}`;
          return (
            <div key={roll.id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{momentsLabel}</p>
                  <button
                    type="button"
                    onClick={() => setQrDialogRoll({ label: momentsLabel, qrUrl, shareUrl })}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    aria-label={`Show QR for ${momentsLabel}`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        aria-label={`Table options for ${momentsLabel}`}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditingRollId(roll.id);
                          setNewTableLabel(roll.label);
                          setAddTableOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit table name
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={roll.filterMode}
                        onValueChange={(value) =>
                          void updateRoll(roll.id, {
                            filterMode: value === "ORIGINAL" ? "ORIGINAL" : "VINTAGE",
                          }).then(
                            () => toast.success("Filter updated"),
                            (e) => toast.error(e instanceof Error ? e.message : "Failed to update filter"),
                          )
                        }
                      >
                        <DropdownMenuRadioItem value="VINTAGE">
                          <Palette className="h-3.5 w-3.5" />
                          Vintage B&W
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="ORIGINAL">
                          <Camera className="h-3.5 w-3.5" />
                          Original color
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={deletingRollId === roll.id}
                        onSelect={() => void deleteRoll(roll.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete table
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] text-muted-foreground">
                  <Camera className="h-3 w-3" />
                  {roll.photoCount}/{roll.maxPhotos}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground [font-family:var(--font-playfair)]">
                  Recent uploads
                </p>
                {roll.photos.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No uploads yet.</p>
                ) : (
                  <div className="mt-2 max-h-[23rem] overflow-y-auto pr-1">
                    <div className="grid grid-cols-3 gap-1.5">
                      {roll.photos.map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => setPhotoDialogUrl(photo.url)}
                          className="group relative cursor-zoom-in overflow-hidden rounded-md border border-border/50"
                        >
                          <img
                            src={thumbnailUrl(photo.url, { width: 320, quality: 65 })}
                            alt={`${momentsLabel} upload`}
                            className="h-28 w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void deletePhoto(photo.id);
                            }}
                            disabled={deletingPhotoId === photo.id}
                            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 disabled:opacity-60"
                            aria-label="Delete photo"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!qrDialogRoll} onOpenChange={(open) => !open && setQrDialogRoll(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-[1.55rem] font-normal leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {qrDialogRoll?.label}
            </DialogTitle>
          </DialogHeader>
          {qrDialogRoll ? (
            <div className="space-y-3">
              <img
                src={qrDialogRoll.qrUrl}
                alt={`${qrDialogRoll.label} QR code`}
                className="w-full rounded-lg border border-border/50"
              />
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground [font-family:var(--font-playfair)]">
                  How to use
                </p>
                <ol className="mt-1.5 space-y-1 text-xs leading-relaxed text-foreground/85">
                  <li>1. Open phone camera and scan this QR code.</li>
                  <li>2. Tap the popup link to open the capture page.</li>
                  <li>3. Take photos and post moments to this table.</li>
                </ol>
              </div>
              <div className="rounded-xl border border-border/60 bg-background p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground [font-family:var(--font-playfair)]">
                  Direct link
                </p>
                <p className="mt-1 break-all text-xs text-foreground/75">{qrDialogRoll.shareUrl}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!photoDialogUrl} onOpenChange={(open) => !open && setPhotoDialogUrl(null)}>
        <DialogContent className="max-w-3xl rounded-2xl">
          {photoDialogUrl ? (
            <img src={photoDialogUrl} alt="Gallery upload preview" className="max-h-[75vh] w-full rounded-lg object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>

      <Drawer
        open={addTableOpen}
        onOpenChange={(open) => {
          if (creating) return;
          setAddTableOpen(open);
          if (!open) {
            setEditingRollId(null);
            setNewTableLabel("");
          }
        }}
        direction="bottom"
      >
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl">
          <DrawerHeader className="px-5 pb-2 pt-3">
          <DrawerTitle className="text-[15px] font-semibold text-foreground">
            {editingRollId ? "Edit table" : "Add table"}
          </DrawerTitle>
          </DrawerHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void (editingRollId ? saveEditTable() : createRoll());
            }}
            className="px-5 pb-5"
          >
            <div className="mb-5">
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground [font-family:var(--font-playfair)]">
                Table label
              </p>
              <Input
                value={newTableLabel}
                onChange={(e) => setNewTableLabel(e.currentTarget.value)}
                disabled={creating}
                className="h-11 rounded-none border-0 border-b border-border bg-transparent px-0 text-sm shadow-none focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex items-center gap-3">
              <DrawerClose asChild>
                <button
                  type="button"
                  disabled={creating}
                  className="flex-1 rounded-full border border-border/60 py-2.5 text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50 [font-family:var(--font-playfair)]"
                >
                  Cancel
                </button>
              </DrawerClose>
              <button
                type="submit"
                disabled={creating}
                className="group relative flex-1 overflow-hidden rounded-full border border-primary py-2.5 text-[10.5px] uppercase tracking-[0.2em] text-primary transition-colors duration-300 hover:text-background disabled:opacity-50 [font-family:var(--font-playfair)]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
                />
                <span className="relative">
                  {creating ? "Saving..." : editingRollId ? "Save table" : "Create table"}
                </span>
              </button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
