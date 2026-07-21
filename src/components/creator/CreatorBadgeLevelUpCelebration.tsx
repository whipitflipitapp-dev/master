"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition, type CSSProperties } from "react";

import { markCelebratedUploadBadgeTier } from "@/app/actions/profile";
import {
  parseCelebratedUploadBadgeTier,
  shouldCelebrateUploadBadge,
  uploadBadgeTierRank,
  type RecipeUploadBadgeTierId,
} from "@/lib/recipe-upload-badges";

import { RecipeUploadBadge } from "./RecipeUploadBadge";

const LOCAL_CELEBRATED_STORAGE_KEY = "wifif_celebrated_upload_badge_tier";

function readLocalCelebratedTier(): RecipeUploadBadgeTierId | null {
  try {
    return parseCelebratedUploadBadgeTier(
      localStorage.getItem(LOCAL_CELEBRATED_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

function writeLocalCelebratedTier(tier: RecipeUploadBadgeTierId) {
  try {
    localStorage.setItem(LOCAL_CELEBRATED_STORAGE_KEY, tier);
  } catch {
    /* private mode / quota */
  }
}

/** Highest tier recorded in DB or local dismiss (local wins when ahead). */
function mergedCelebratedTier(
  fromServer: RecipeUploadBadgeTierId | null,
  fromLocal: RecipeUploadBadgeTierId | null,
): RecipeUploadBadgeTierId | null {
  if (fromServer == null) return fromLocal;
  if (fromLocal == null) return fromServer;
  return uploadBadgeTierRank(fromLocal) >= uploadBadgeTierRank(fromServer)
    ? fromLocal
    : fromServer;
}

type CreatorBadgeLevelUpCelebrationProps = {
  tier: RecipeUploadBadgeTierId;
  /** Last tier celebrated in the profile (may be null before migration or first visit). */
  celebratedTier: RecipeUploadBadgeTierId | null;
  levelLabel: string;
  title: string;
  body: string;
  dismissLabel: string;
};

const FIREWORK_BURSTS = [
  { left: "12%", top: "18%", delay: "0s", hue: "var(--primary)" },
  { left: "78%", top: "14%", delay: "0.35s", hue: "#ca8a04" },
  { left: "48%", top: "8%", delay: "0.7s", hue: "#7c3aed" },
  { left: "22%", top: "32%", delay: "1.05s", hue: "#0f766e" },
  { left: "68%", top: "28%", delay: "0.55s", hue: "#b45309" },
] as const;

const SPARKS = Array.from({ length: 10 }, (_, i) => i);

function FireworkBurst({
  left,
  top,
  delay,
  hue,
  styleId,
}: {
  left: string;
  top: string;
  delay: string;
  hue: string;
  styleId: string;
}) {
  return (
    <div
      className="pointer-events-none absolute h-0 w-0"
      style={{ left, top }}
      aria-hidden
    >
      {SPARKS.map((i) => (
        <span
          key={i}
          className={`creator-badge-firework-spark creator-badge-firework-spark--${styleId}-${i}`}
          style={
            {
              "--spark-hue": hue,
              "--spark-i": i,
              animationDelay: delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Full-screen celebration when a creator reaches a new upload-badge tier. */
export function CreatorBadgeLevelUpCelebration({
  tier,
  celebratedTier,
  levelLabel,
  title,
  body,
  dismissLabel,
}: CreatorBadgeLevelUpCelebrationProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const dismissRef = useRef<HTMLButtonElement>(null);
  const styleId = useId().replace(/:/g, "");

  useEffect(() => {
    const celebrated = mergedCelebratedTier(
      celebratedTier,
      readLocalCelebratedTier(),
    );
    setOpen(shouldCelebrateUploadBadge(tier, celebrated));
  }, [tier, celebratedTier]);

  useEffect(() => {
    if (!open) return;
    dismissRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleDismiss = useCallback(() => {
    writeLocalCelebratedTier(tier);
    setOpen(false);
    startTransition(async () => {
      const result = await markCelebratedUploadBadgeTier(tier);
      if (result.ok) {
        router.refresh();
      }
    });
  }, [tier, router]);

  return (
    <>
      <style>{`
        @keyframes creator-badge-firework-burst {
          0% {
            opacity: 0;
            transform: rotate(calc(var(--spark-i) * 36deg)) translateY(0) scale(0.35);
          }
          12% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(calc(var(--spark-i) * 36deg)) translateY(-4.5rem) scale(1);
          }
        }
        .creator-badge-firework-spark {
          position: absolute;
          left: 0;
          top: 0;
          width: 0.35rem;
          height: 0.35rem;
          border-radius: 9999px;
          background: var(--spark-hue);
          box-shadow: 0 0 0.5rem color-mix(in srgb, var(--spark-hue) 55%, transparent);
          animation: creator-badge-firework-burst 1.35s ease-out infinite;
        }
      `}</style>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="creator-badge-celebration"
            className="fixed inset-0 z-[250] flex items-center justify-center p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="creator-badge-celebration-title"
            aria-describedby="creator-badge-celebration-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {FIREWORK_BURSTS.map((burst, idx) => (
                <FireworkBurst key={idx} {...burst} styleId={styleId} />
              ))}
            </div>
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-[var(--shadow-card)]"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
            >
              <p
                id="creator-badge-celebration-title"
                className="text-xl font-bold tracking-tight text-[var(--text)]"
              >
                {title}
              </p>
              <p
                id="creator-badge-celebration-body"
                className="mt-2 text-sm leading-relaxed text-[var(--muted)]"
              >
                {body}
              </p>
              <div className="mt-5 flex justify-center">
                <RecipeUploadBadge tier={tier} label={levelLabel} size="md" />
              </div>
              <button
                ref={dismissRef}
                type="button"
                onClick={handleDismiss}
                disabled={pending}
                className="mt-6 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-70"
              >
                {dismissLabel}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
