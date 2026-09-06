"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// ── icons ───────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── shared sub-components ────────────────────────────────────────────────────

const inputClass =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-[var(--color-line)] pb-2 font-display text-base">
      {children}
    </h2>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  required,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

// ── main form ────────────────────────────────────────────────────────────────

export function AccountSettingsForm({
  userId,
  email,
  initialName,
  initialAvatarUrl,
}: {
  userId: string;
  email: string;
  initialName: string | null;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();

  // Profile section state
  const [fullName, setFullName] = useState(initialName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password section state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Image must be under 2 MB.");
      e.target.value = "";
      return;
    }
    setProfileError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus("saving");
    setProfileError(null);

    const supabase = createClient();
    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        setProfileError(uploadError.message);
        setProfileStatus("error");
        return;
      }
      // Store the stable public URL so any component can render it without
      // a signed-URL round-trip (avatars bucket is public).
      newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, avatar_url: newAvatarUrl })
      .eq("id", userId);

    if (dbError) {
      setProfileError(dbError.message);
      setProfileStatus("error");
      return;
    }

    // Sync full_name into auth user_metadata so SiteHeader reflects the
    // change immediately after router.refresh().
    await supabase.auth.updateUser({ data: { full_name: fullName || null } });

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setProfileStatus("saved");
    router.refresh();
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setPasswordStatus("saving");

    const supabase = createClient();

    // Re-authenticate with the current password to verify it before changing.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) {
      setPasswordError("Current password is incorrect.");
      setPasswordStatus("error");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPasswordError(updateError.message);
      setPasswordStatus("error");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordStatus("saved");
  }

  const displaySrc = avatarPreview ?? avatarUrl ?? null;

  return (
    <div className="space-y-12">

      {/* ── Profile: name + avatar ── */}
      <form onSubmit={handleProfileSave} className="space-y-6">
        <SectionHeading>Profile</SectionHeading>

        {/* Avatar */}
        <div>
          <p className="mb-2 text-sm font-medium">Profile picture</p>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden bg-[var(--color-line)]">
              {displaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displaySrc}
                  alt="Profile picture"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-medium text-[var(--color-muted)]">
                  {(fullName || email).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="avatar-upload"
                className="inline-flex cursor-pointer items-center border border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
              >
                {avatarUrl ? "Change picture" : "Upload picture"}
              </label>
              {avatarFile && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">{avatarFile.name}</p>
              )}
              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">JPEG, PNG or WebP · max 2 MB</p>
            </div>
          </div>
        </div>

        {/* Full name */}
        <div>
          <label htmlFor="full-name" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className={inputClass}
          />
        </div>

        {/* Email — read-only */}
        <div>
          <p className="mb-1.5 text-sm font-medium">Email address</p>
          <p className="text-sm">{email}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Email cannot be changed here. Contact support if you need to update it.
          </p>
        </div>

        {profileError && <p className="text-sm text-[var(--color-rust)]">{profileError}</p>}
        {profileStatus === "saved" && (
          <p className="text-sm text-[var(--color-green)]">Changes saved.</p>
        )}

        <Button type="submit" disabled={profileStatus === "saving"}>
          {profileStatus === "saving" ? "Saving…" : "Save changes"}
        </Button>
      </form>

      {/* ── Password ── */}
      <form onSubmit={handlePasswordSave} className="space-y-4">
        <SectionHeading>Change password</SectionHeading>

        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          required
        />
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          required
          minLength={6}
        />
        <PasswordField
          id="confirm-new-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />

        {passwordError && <p className="text-sm text-[var(--color-rust)]">{passwordError}</p>}
        {passwordStatus === "saved" && (
          <p className="text-sm text-[var(--color-green)]">Password updated.</p>
        )}

        <Button type="submit" disabled={passwordStatus === "saving"}>
          {passwordStatus === "saving" ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
