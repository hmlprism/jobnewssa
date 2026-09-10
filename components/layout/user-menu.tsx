"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LogOut, User, Briefcase, FileText, Settings } from "lucide-react";

export function UserMenu({
  email,
  name,
  role,
}: {
  email: string;
  name?: string;
  role?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  const displayName = name ?? email;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="flex h-8 w-8 items-center justify-center bg-[var(--color-ink)] text-xs font-semibold text-[var(--color-paper)]">
          {initial}
        </span>
        <span className="hidden sm:block">{displayName}</span>
        <ChevronDown size={14} className={`hidden transition-transform duration-150 sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 border border-[var(--color-line)] bg-[var(--color-paper)] shadow-sm">
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{email}</p>
          </div>

          <div className="py-1">
            {role === "employer" && (
              <MenuLink href="/employer/dashboard" icon={<Briefcase size={15} />} onClick={() => setOpen(false)}>
                Employer dashboard
              </MenuLink>
            )}
            {role === "job_seeker" && (
              <MenuLink href="/applications" icon={<FileText size={15} />} onClick={() => setOpen(false)}>
                My applications
              </MenuLink>
            )}
            <MenuLink href="/profile/edit" icon={<User size={15} />} onClick={() => setOpen(false)}>
              My profile
            </MenuLink>
            <MenuLink href="/account/settings" icon={<Settings size={15} />} onClick={() => setOpen(false)}>
              Account settings
            </MenuLink>
          </div>

          <div className="border-t border-[var(--color-line)] py-1">
            <button
              onClick={handleSignOut}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm text-[var(--color-muted)] hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)]"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-rust)]"
    >
      <span className="text-[var(--color-muted)]">{icon}</span>
      {children}
    </Link>
  );
}
