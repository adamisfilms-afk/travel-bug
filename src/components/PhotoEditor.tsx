"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LinkSimple, Trash, UploadSimple, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverrides, type PhotoItem } from "@/lib/curated/overrides";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Slide } from "./PlaceModal";

const keyOf = (p: PhotoItem) => (p.kind === "google" ? `g:${p.name}` : `u:${p.src}`);

function Thumb({ item, index, onRemove }: { item: PhotoItem; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: keyOf(item) });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx("group relative aspect-[4/3] rounded-xl overflow-hidden bg-line/40 touch-none", isDragging && "z-10 opacity-70 shadow-xl")}
    >
      <div {...attributes} {...listeners} aria-label={`Photo ${index + 1} — drag to reorder`} className="absolute inset-0 cursor-grab active:cursor-grabbing">
        {item.kind === "google" ? (
          <Slide name={item.name} alt="" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.src} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
        )}
      </div>
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-ink/65 text-white text-[11px] px-2 py-0.5">
        {index === 0 ? "Cover" : index + 1}
        {item.kind === "google" ? " · Google" : item.src.startsWith("/curated/") ? " · Upload" : " · Link"}
      </span>
      <button
        type="button"
        aria-label="Delete photo"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 grid place-items-center size-7 rounded-full bg-white/95 shadow text-ink/70 hover:text-price-up"
      >
        <Trash className="size-3.5" />
      </button>
    </div>
  );
}

/** Admin: delete, reorder and add photos for a curated place. Saves to data/curated-overrides.json. */
export function PhotoEditor({
  placeId,
  placeName,
  initial,
  custom,
  onClose,
}: {
  placeId: string;
  placeName: string;
  /** The photos as currently shown. */
  initial: PhotoItem[];
  /** Whether the place already has a curated photo list (vs. automatic photos). */
  custom: boolean;
  onClose: () => void;
}) {
  const current = useOverrides((s) => s.overrides[placeId]);
  const save = useOverrides((s) => s.save);
  const [items, setItems] = useState<PhotoItem[]>(initial);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"" | "uploading" | "saving">("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = (p: PhotoItem) => setItems((xs) => (xs.some((x) => keyOf(x) === keyOf(p)) ? xs : [...xs, p]));

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    const url = link.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return setError("Paste a full image link starting with https://");
    setError("");
    add({ kind: "url", src: url });
    setLink("");
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy("uploading");
    setError("");
    for (const file of Array.from(files)) {
      try {
        const sb = supabaseBrowser();
        if (sb) {
          // Ask the server for a one-time upload link, then send the photo straight to Supabase Storage
          const res = await fetch("/api/curated/upload", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ place: placeId, type: file.type, size: file.size }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d?.error ?? "Upload failed.");
          const { error } = await sb.storage.from("curated").uploadToSignedUrl(d.path, d.token, file, { contentType: file.type });
          if (error) throw new Error(error.message);
          add({ kind: "url", src: d.src });
          continue;
        }
        const body = new FormData();
        body.set("file", file);
        body.set("place", placeId);
        const res = await fetch("/api/curated/upload", { method: "POST", body });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error ?? "Upload failed.");
        add({ kind: "url", src: d.src });
      } catch (err) {
        setError(`${file.name}: ${err instanceof Error ? err.message : "Upload failed."}`);
      }
    }
    setBusy("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const persist = async (photos: PhotoItem[] | undefined) => {
    setBusy("saving");
    setError("");
    try {
      await save(placeId, { ...current, photos });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
      setBusy("");
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setItems((xs) => arrayMove(xs, xs.findIndex((x) => keyOf(x) === active.id), xs.findIndex((x) => keyOf(x) === over.id)));
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/40 p-3 sm:p-8" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit photos for ${placeName}`}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-[720px] rounded-2xl bg-surface border border-line shadow-2xl p-5 md:p-7 space-y-4"
      >
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-4 right-4 grid place-items-center size-8 rounded-full hover:bg-line/50">
          <X weight="bold" className="size-4" />
        </button>
        <div className="pr-10">
          <h2 className="font-serif text-[26px] leading-tight">Edit photos</h2>
          <p className="text-[13px] text-ink-muted">
            {placeName} · Drag to reorder — the first photo is the cover on cards. {!custom && "Currently showing automatic photos."}
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map(keyOf)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((p, i) => (
                <Thumb key={keyOf(p)} item={p} index={i} onRemove={() => setItems((xs) => xs.filter((x) => keyOf(x) !== keyOf(p)))} />
              ))}
              {items.length === 0 && <p className="col-span-full text-[13px] text-ink-muted py-6 text-center">No photos — add some below.</p>}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex flex-wrap gap-2">
          <form onSubmit={addLink} className="flex flex-1 min-w-64 gap-2">
            <label className="flex flex-1 items-center gap-2 h-10 rounded-lg bg-white px-3 border border-line focus-within:border-accent-soft">
              <LinkSimple className="size-4 text-ink-muted shrink-0" />
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste an image link…" className="flex-1 min-w-0 bg-transparent outline-none text-[14px]" />
            </label>
            <button type="submit" className="h-10 px-4 rounded-lg bg-ink text-white text-[14px] hover:bg-accent">
              Add
            </button>
          </form>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy === "uploading"}
            className="h-10 px-4 rounded-lg border border-line bg-white text-[14px] inline-flex items-center gap-1.5 hover:border-ink/40 disabled:opacity-60"
          >
            <UploadSimple className="size-4" /> {busy === "uploading" ? "Uploading…" : "Upload"}
          </button>
        </div>
        {error && <p className="text-[13px] text-price-up">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
          {custom ? (
            <button type="button" onClick={() => persist(undefined)} disabled={!!busy} className="text-[13px] text-ink-muted underline underline-offset-2 hover:text-ink">
              Reset to automatic photos
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-full border border-line bg-white text-[14px] hover:border-ink/40">
              Cancel
            </button>
            <button type="button" onClick={() => persist(items)} disabled={!!busy} className="h-9 px-5 rounded-full bg-accent text-white text-[14px] disabled:opacity-60">
              {busy === "saving" ? "Saving…" : "Save photos"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
