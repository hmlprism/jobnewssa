"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";

export function SaveButton({
  jobId,
  initialSaved = false,
  glyph = false,
}: {
  jobId: string;
  initialSaved?: boolean;
  /** Use typographic ◆/◇ marker instead of the Bookmark icon */
  glyph?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      const res = await fetch("/api/saved-jobs/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (res.status === 401) {
        router.push(
          `/auth/login?next=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      if (res.ok) {
        const { saved: next } = await res.json();
        setSaved(next);
      }
    } finally {
      setLoading(false);
    }
  }

  if (glyph) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={saved ? "Unsave this job" : "Save this job"}
        title={saved ? "Unsave" : "Save"}
        className="relative z-10 shrink-0 cursor-pointer select-none px-1 py-1 text-[11px] leading-none transition-colors disabled:pointer-events-none disabled:opacity-40"
        style={{ color: saved ? "var(--color-rust)" : "var(--color-muted)" }}
      >
        {saved ? "◆" : "◇"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Unsave this job" : "Save this job"}
      title={saved ? "Unsave" : "Save"}
      className="relative z-10 shrink-0 cursor-pointer p-1 text-[var(--color-muted)] transition-colors hover:text-[var(--color-rust)] disabled:pointer-events-none disabled:opacity-40"
    >
      <Bookmark
        size={16}
        className={
          saved
            ? "fill-[var(--color-rust)] text-[var(--color-rust)]"
            : ""
        }
      />
    </button>
  );
}
