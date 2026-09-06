"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({
  isLoggedIn,
  unreadCount,
}: {
  isLoggedIn: boolean;
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center justify-center p-1 text-[var(--color-ink)]"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-[var(--color-ink)]/30"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <nav className="fixed inset-y-0 right-0 z-50 w-72 bg-[var(--color-paper)] shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <span className="font-display text-lg font-semibold">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="flex cursor-pointer items-center justify-center p-1 text-[var(--color-ink)]"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col px-5 py-4">
              <MobileLink href="/jobs" onClick={() => setOpen(false)}>
                Find jobs
              </MobileLink>
              <MobileLink href="/news" onClick={() => setOpen(false)}>
                Job market news
              </MobileLink>
              <MobileLink href="/employer/post" onClick={() => setOpen(false)}>
                Post a job
              </MobileLink>
              {isLoggedIn && (
                <MobileLink href="/messages" onClick={() => setOpen(false)}>
                  Messages
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center bg-[var(--color-rust)] px-1.5 py-px text-[10px] font-bold leading-none text-[var(--color-paper)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </MobileLink>
              )}

              {!isLoggedIn && (
                <div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-4">
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="block py-2 text-[15px] font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setOpen(false)}
                    className="block bg-[var(--color-rust)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
                  >
                    Create free account
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center border-b border-[var(--color-line)] py-3 text-[15px] font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)]"
    >
      {children}
    </Link>
  );
}
