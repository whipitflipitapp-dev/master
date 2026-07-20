"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

export type GalleryReorderItem = {
  id: string;
  imageUrl: string;
};

type RecipeGalleryReorderProps = {
  items: GalleryReorderItem[];
  onChange: (items: GalleryReorderItem[]) => void;
  disabled?: boolean;
  hint: string;
  coverLabel: string;
  setCoverLabel: string;
  moveEarlierLabel: string;
  moveLaterLabel: string;
  removeLabel?: string;
  allowRemove?: boolean;
};

export function RecipeGalleryReorder({
  items,
  onChange,
  disabled = false,
  hint,
  coverLabel,
  setCoverLabel,
  removeLabel,
  moveEarlierLabel,
  moveLaterLabel,
  allowRemove = false,
}: RecipeGalleryReorderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= items.length ||
        toIndex >= items.length
      ) {
        return;
      }
      const next = [...items];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onChange(next);
    },
    [items, onChange],
  );

  const setAsCover = (index: number) => {
    if (index <= 0) return;
    reorder(index, 0);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-[length:var(--text-caption)] leading-relaxed text-[var(--muted)]">
        {hint}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((photo, index) => (
          <li
            key={photo.id}
            draggable={!disabled}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) {
                reorder(dragIndex, index);
              }
              setDragIndex(null);
            }}
            className={`relative aspect-[4/3] overflow-hidden rounded-xl border bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] shadow-[var(--shadow-card)] ${
              dragIndex === index
                ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/35"
                : "border-[color-mix(in_srgb,var(--muted)_30%,transparent)]"
            } ${!disabled ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <Image
              src={photo.imageUrl}
              alt={
                index === 0
                  ? "Recipe cover photo"
                  : `Recipe gallery photo ${index + 1}`
              }
              fill
              sizes="(max-width: 640px) 45vw, 12rem"
              className="pointer-events-none object-cover"
              unoptimized
            />
            {index === 0 ? (
              <span className="absolute left-2 top-2 rounded-md bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                {coverLabel}
              </span>
            ) : (
              <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                {index + 1}
              </span>
            )}
            {allowRemove && items.length > 1 ? (
              <button
                type="button"
                aria-label={`${removeLabel} ${index + 1}`}
                disabled={disabled}
                className="absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[length:var(--text-caption)] font-medium text-white disabled:opacity-50"
                onClick={() => removeAt(index)}
              >
                {removeLabel}
              </button>
            ) : null}
            {items.length > 1 ? (
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-2 pt-8">
                {index > 0 ? (
                  <>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setAsCover(index)}
                      className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--text)] hover:bg-white disabled:opacity-50"
                    >
                      {setCoverLabel}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`${moveEarlierLabel} ${index + 1}`}
                      onClick={() => reorder(index, index - 1)}
                      className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-[var(--text)] hover:bg-white disabled:opacity-50"
                    >
                      ←
                    </button>
                  </>
                ) : null}
                {index < items.length - 1 ? (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`${moveLaterLabel} ${index + 1}`}
                    onClick={() => reorder(index, index + 1)}
                    className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-[var(--text)] hover:bg-white disabled:opacity-50"
                  >
                    →
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
