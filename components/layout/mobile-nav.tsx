"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";

export function MobileNav({
  isLoggedIn,
  unreadCount = 0,
}: {
  isLoggedIn: boolean;
  unreadCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Header");

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center justify-center p-1 text-[var(--color-ink)]"
        aria-label={t("mobileNav.openMenu")}
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
              <span className="font-display text-lg font-semibold">{t("mobileNav.panelTitle")}</span>
              <button
                onClick={() => setOpen(false)}
                className="flex cursor-pointer items-center justify-center p-1 text-[var(--color-ink)]"
                aria-label={t("mobileNav.closeMenu")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col px-5 py-4">
              <MobileLink href="/" onClick={() => setOpen(false)}>
                {t("nav.home")}
              </MobileLink>
              <MobileLink href="/jobs" onClick={() => setOpen(false)}>
                {t("nav.findJobs")}
              </MobileLink>
              <MobileLink href="/tools" onClick={() => setOpen(false)}>
                {t("nav.tools")}
              </MobileLink>
              <MobileLink href="/saved" onClick={() => setOpen(false)}>
                {t("nav.saved")}
              </MobileLink>
              <MobileLink href="/applications" onClick={() => setOpen(false)}>
                {t("nav.applications")}
              </MobileLink>
              <MobileLink href="/news" onClick={() => setOpen(false)}>
                {t("nav.newsLong")}
              </MobileLink>
              <MobileLink href="/employer/post" onClick={() => setOpen(false)}>
                {t("nav.postJob")}
              </MobileLink>
              {isLoggedIn && (
                <MobileLink href="/messages" onClick={() => setOpen(false)}>
                  {t("nav.messages")}
                  {unreadCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center bg-[var(--color-rust)] px-1.5 py-px text-[10px] font-bold leading-none text-[var(--color-paper)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </MobileLink>
              )}

              {!isLoggedIn && (
                <div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-4">
                  <Link
                    href="/auth/login"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block py-2 text-[15px] font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)]"
                  >
                    {t("auth.signIn")}
                  </Link>
                  <Link
                    href="/auth/signup"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block bg-[var(--color-rust)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
                  >
                    {t("auth.createAccountFree")}
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
      prefetch={false}
      onClick={onClick}
      className="flex items-center border-b border-[var(--color-line)] py-3 text-[15px] font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)]"
    >
      {children}
    </Link>
  );
}
