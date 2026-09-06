"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

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
  const [optimisticMessages, setOptimisticMessages] = useState<MsgRow[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const serverIds = new Set(initialMessages.map((m) => m.id));
    setOptimisticMessages((prev) => prev.filter((m) => !serverIds.has(m.id)));
  }, [initialMessages]);

  const displayMessages = [...initialMessages, ...optimisticMessages];

  async function sendMessage() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("messages")
      .insert({
        application_id: applicationId,
        sender_id: currentUserId,
        body: trimmed,
      })
      .select("id, sender_id, body, created_at")
      .single();

    if (err || !data) {
      setError("Failed to send. Please try again.");
      setSending(false);
      return;
    }

    setOptimisticMessages((prev) => [
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Messages */}
      <div className="mb-6 min-h-[8rem]">
        {displayMessages.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-muted)]">
            No messages yet. Send one to get the conversation started.
          </p>
        ) : (
          <div className="space-y-4">
            {displayMessages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 text-sm ${
                      isMine
                        ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                        : "border border-[var(--color-line)] bg-[var(--color-paper-dim)] text-[var(--color-ink)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {isMine ? "You" : (msg.senderName ?? otherPartyName)} ·{" "}
                    {formatMsgTime(msg.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--color-line)] pt-4"
      >
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message…"
            rows={3}
            disabled={sending}
            className="w-full resize-none border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-3 pr-12 text-sm placeholder:text-[var(--color-muted)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="absolute bottom-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center bg-[var(--color-rust)] text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)] disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        {error && (
          <p className="mt-1 text-sm text-[var(--color-rust)]">{error}</p>
        )}
      </form>
    </>
  );
}
