"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SA_PROVINCES, type Profile } from "@/types/database";

export function ProfileEditForm({
  profile,
  userId,
}: {
  profile: Profile;
  userId: string;
}) {
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [province, setProvince] = useState(profile.province ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [hasResume, setHasResume] = useState(!!profile.resume_url);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    setError(null);

    const supabase = createClient();
    let resume_url = profile.resume_url;

    if (resumeFile) {
      const path = `${userId}/${Date.now()}_${resumeFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(path, resumeFile, { upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        setSaveStatus("error");
        return;
      }
      resume_url = path;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        headline: headline || null,
        phone: phone || null,
        province: province || null,
        city: city || null,
        resume_url,
      })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setSaveStatus("error");
      return;
    }

    if (resumeFile) setHasResume(true);
    setSaveStatus("saved");
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resume */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Resume <span className="font-normal text-[var(--color-muted)]">(PDF, max 5 MB)</span>
        </label>
        {hasResume && (
          <p className="mb-2 text-sm text-[var(--color-green)]">Resume on file</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="block text-sm text-[var(--color-ink)]"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file && file.size > 5 * 1024 * 1024) {
              setError("File must be under 5 MB.");
              e.target.value = "";
              return;
            }
            setError(null);
            setResumeFile(file);
          }}
        />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {hasResume
            ? "Upload a new file to replace your existing resume."
            : "A resume is required before you can apply for jobs."}
        </p>
      </div>

      {/* Headline */}
      <div>
        <label htmlFor="headline" className="mb-1.5 block text-sm font-medium">
          Professional headline
        </label>
        <input
          id="headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Senior Software Engineer"
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 082 123 4567"
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        />
      </div>

      {/* Province */}
      <div>
        <label htmlFor="province" className="mb-1.5 block text-sm font-medium">
          Province
        </label>
        <select
          id="province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        >
          <option value="">Select province</option>
          {SA_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
          City / Town
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Cape Town"
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

      {saveStatus === "saved" && (
        <p className="text-sm text-[var(--color-green)]">Profile saved.</p>
      )}

      <Button type="submit" disabled={saveStatus === "saving"}>
        {saveStatus === "saving" ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
