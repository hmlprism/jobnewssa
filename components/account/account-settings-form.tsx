"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { DeleteDataPanel } from "@/components/account/delete-data-panel";
import { DeleteAccountPanel } from "@/components/account/delete-account-panel";

const inputClass =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
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
  const t = useTranslations("AccountSettings");
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
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label={show ? t("password.hide") : t("password.show")}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

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
  const t = useTranslations("AccountSettings");
  const router = useRouter();

  const [fullName, setFullName] = useState(initialName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError(t("profile.picTooLarge"));
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
      newAvatarUrl = supabase.storage
        .from("avatars")
        .getPublicUrl(path).data.publicUrl;
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

    await supabase.auth.updateUser({
      data: { full_name: fullName || null },
    });

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
      setPasswordError(t("password.mismatch"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("password.tooShort"));
      return;
    }

    setPasswordStatus("saving");

    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) {
      setPasswordError(t("password.incorrect"));
      setPasswordStatus("error");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
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
      {/* Profile */}
      <form onSubmit={handleProfileSave} className="space-y-6">
        <SectionHeading>{t("profile.sectionHeading")}</SectionHeading>

        {/* Avatar */}
        <div>
          <p className="mb-2 text-sm font-medium">{t("profile.picLabel")}</p>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden bg-[var(--color-line)]">
              {displaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displaySrc}
                  alt={t("profile.picAlt")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-medium text-[var(--color-muted)]">
                  {(fullName || email).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="avatar-upload"
                className="inline-flex cursor-pointer items-center border border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
              >
                {avatarUrl ? t("profile.changePic") : t("profile.uploadPic")}
              </label>
              {avatarFile && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {avatarFile.name}
                </p>
              )}
              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t("profile.picHint")}
              </p>
            </div>
          </div>
        </div>

        {/* Full name */}
        <div>
          <label
            htmlFor="full-name"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("profile.fullName")}
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("profile.fullNamePlaceholder")}
            className={inputClass}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("profile.emailAddress")}</p>
          <p className="text-sm">{email}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t("profile.emailHint")}
          </p>
        </div>

        {profileError && (
          <p className="text-sm text-[var(--color-rust)]">{profileError}</p>
        )}
        {profileStatus === "saved" && (
          <p className="text-sm text-[var(--color-green)]">{t("profile.saved")}</p>
        )}

        <Button type="submit" disabled={profileStatus === "saving"}>
          {profileStatus === "saving" ? t("profile.saving") : t("profile.save")}
        </Button>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordSave} className="space-y-4">
        <SectionHeading>{t("password.sectionHeading")}</SectionHeading>

        <PasswordField
          id="current-password"
          label={t("password.current")}
          value={currentPassword}
          onChange={setCurrentPassword}
          required
        />
        <PasswordField
          id="new-password"
          label={t("password.new")}
          value={newPassword}
          onChange={setNewPassword}
          required
          minLength={6}
        />
        <PasswordField
          id="confirm-new-password"
          label={t("password.confirm")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />

        {passwordError && (
          <p className="text-sm text-[var(--color-rust)]">{passwordError}</p>
        )}
        {passwordStatus === "saved" && (
          <p className="text-sm text-[var(--color-green)]">
            {t("password.updated")}
          </p>
        )}

        <Button type="submit" disabled={passwordStatus === "saving"}>
          {passwordStatus === "saving" ? t("password.updating") : t("password.update")}
        </Button>
      </form>

      {/* Data & account deletion */}
      <DeleteDataPanel />
      <DeleteAccountPanel />
    </div>
  );
}
