"use client";

import { useEffect, useState } from "react";

export function UnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/messages/unread-count")
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => {});
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-1.5 inline-flex items-center justify-center bg-[var(--color-rust)] px-1.5 py-px text-[10px] font-bold leading-none text-[var(--color-paper)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
