"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";

export function SaveButton({
  jobId,
  initialSaved = false,
}: {
  jobId: string;
  initialSaved?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
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
        if (next) {
          // play fill animation only on the save action, not on initial render
          setAnimating(true);
          setTimeout(() => setAnimating(false), 200);
        }
        setSaved(next);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Unsave this job" : "Save this job"}
      title={saved ? "Unsave" : "Save"}
      className="relative z-10 shrink-0 cursor-pointer p-1 text-[var(--color-muted)] transition-colors hover:text-[var(--color-gold)] disabled:pointer-events-none disabled:opacity-40"
    >
      <Bookmark
        size={16}
        className={`transition-colors duration-150${animating ? " bookmark-fill" : ""}${saved ? " fill-[var(--color-gold)] text-[var(--color-gold)]" : ""}`}
      />
    </button>
  );
}
