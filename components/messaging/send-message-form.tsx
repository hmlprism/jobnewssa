"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SendMessageForm({
  applicationId,
  userId,
}: {
  applicationId: string;
  userId: string;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.from("messages").insert({
      application_id: applicationId,
      sender_id: userId,
      body: trimmed,
      // Sender's own message is immediately "read" from their perspective
      read_at: new Date().toISOString(),
    });

    if (err) {
      setError("Failed to send. Please try again.");
      setSending(false);
      return;
    }

    setBody("");
    setSending(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[var(--color-line)] pt-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message…"
        rows={3}
        disabled={sending}
        className="w-full resize-none border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-ink)] disabled:opacity-50"
      />
      {error && (
        <p className="mt-1 text-sm text-[var(--color-rust)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={sending || !body.trim()}
        className="mt-2 bg-[var(--color-rust)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)] disabled:opacity-50 disabled:pointer-events-none"
      >
        {sending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
