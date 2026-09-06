"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export type MsgRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  senderName: string | null;
};

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const timeStr = d.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return `Today at ${timeStr}`;
  return (
    d.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    }) + ` at ${timeStr}`
  );
}

export function MessageThread({
  applicationId,
  currentUserId,
  otherPartyName,
  initialMessages,
}: {
  applicationId: string;
  currentUserId: string;
  otherPartyName: string;
  initialMessages: MsgRow[];
}) {
  const [messages, setMessages] = useState<MsgRow[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // When router.refresh() completes the server re-renders ThreadContent with
  // fresh data, which updates initialMessages. Sync local state to it, but
  // only if the server returned at least as many messages as we have locally
  // — guards against a rare race where the refresh beat the DB write.
  useEffect(() => {
    setMessages((current) =>
      initialMessages.length >= current.length ? initialMessages : current
    );
  }, [initialMessages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("messages")
      .insert({
        application_id: applicationId,
        sender_id: currentUserId,
        body: trimmed,
        // Sender's own message is immediately "read" from their perspective
        read_at: new Date().toISOString(),
      })
      .select("id, sender_id, body, created_at")
      .single();

    if (err || !data) {
      setError("Failed to send. Please try again.");
      setSending(false);
      return;
    }

    // Show the sent message immediately (optimistic) — the useEffect above
    // will replace it with the canonical server version once router.refresh()
    // completes and initialMessages updates.
    setMessages((prev) => [
      ...prev,
      {
        id: data.id,
        sender_id: data.sender_id,
        body: data.body,
        created_at: data.created_at,
        senderName: null,
      },
    ]);
    setBody("");
    setSending(false);
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 min-h-[8rem]">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            No messages yet. Send one to get the conversation started.
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 text-sm ${
                      isMine
                        ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                        : "bg-[var(--color-line)] text-[var(--color-ink)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {isMine ? "You" : (msg.senderName ?? otherPartyName)}{" "}
                    · {formatMsgTime(msg.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </>
  );
}
