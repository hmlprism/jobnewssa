"use client";

import { SA_PROVINCES } from "@/types/database";
import type { CvContact } from "@/types/cv";

interface Props {
  contact: CvContact;
  idNumber: string;
  includePhoto: boolean;
  hasAvatar: boolean;
  onChange: (contact: CvContact) => void;
  onIdNumberChange: (val: string) => void;
  onIncludePhotoChange: (val: boolean) => void;
}

const field =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";

const label = "block text-sm font-medium text-[var(--color-ink)] mb-1";

function Field({
  id,
  children,
  hint,
}: {
  id: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>
      )}
    </div>
  );
}

export function StepContact({
  contact,
  idNumber,
  includePhoto,
  hasAvatar,
  onChange,
  onIdNumberChange,
  onIncludePhotoChange,
}: Props) {
  const set = (key: keyof CvContact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...contact, [key]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name">
          <label htmlFor="cv-name" className={label}>
            Full name <span className="text-[var(--color-rust)]">*</span>
          </label>
          <input
            id="cv-name"
            type="text"
            required
            autoComplete="name"
            className={field}
            placeholder="Thandi Mokoena"
            value={contact.name}
            onChange={set("name")}
          />
        </Field>

        <Field id="email">
          <label htmlFor="cv-email" className={label}>
            Email <span className="text-[var(--color-rust)]">*</span>
          </label>
          <input
            id="cv-email"
            type="email"
            required
            autoComplete="email"
            className={field}
            placeholder="you@email.co.za"
            value={contact.email}
            onChange={set("email")}
          />
        </Field>

        <Field id="phone">
          <label htmlFor="cv-phone" className={label}>
            Phone number
          </label>
          <input
            id="cv-phone"
            type="tel"
            autoComplete="tel"
            className={field}
            placeholder="071 234 5678"
            value={contact.phone}
            onChange={set("phone")}
          />
        </Field>

        <Field id="city">
          <label htmlFor="cv-city" className={label}>
            City
          </label>
          <input
            id="cv-city"
            type="text"
            autoComplete="address-level2"
            className={field}
            placeholder="Johannesburg"
            value={contact.city}
            onChange={set("city")}
          />
        </Field>

        <Field id="province">
          <label htmlFor="cv-province" className={label}>
            Province
          </label>
          <select
            id="cv-province"
            className={field}
            value={contact.province}
            onChange={set("province")}
          >
            <option value="">— Select province —</option>
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="linkedin"
          hint="Enter your full LinkedIn URL or just your handle (e.g. thandi-mokoena)"
        >
          <label htmlFor="cv-linkedin" className={label}>
            LinkedIn
          </label>
          <input
            id="cv-linkedin"
            type="text"
            className={field}
            placeholder="thandi-mokoena"
            value={contact.linkedin}
            onChange={set("linkedin")}
          />
        </Field>
      </div>

      {/* SA ID number — display-only, never saved */}
      <div className="border border-[var(--color-line)] bg-[var(--color-paper-dim)] p-4">
        <p className="mb-3 text-sm font-medium text-[var(--color-ink)]">
          ID number{" "}
          <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={13}
          className={field}
          placeholder="8001015009087"
          value={idNumber}
          onChange={(e) => onIdNumberChange(e.target.value.replace(/\D/g, ""))}
        />
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Your ID number appears on the PDF only — it is never stored on this site.
          Many modern employers no longer require it on the initial CV. We recommend
          leaving it blank unless the job advert specifically asks for it.
        </p>
      </div>

      {/* Photo toggle — only shown if the user has a profile photo */}
      {hasAvatar && (
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={includePhoto}
            onChange={(e) => onIncludePhotoChange(e.target.checked)}
          />
          <span className="text-sm text-[var(--color-ink)]">
            Include my profile photo on the CV
            <span className="block text-xs text-[var(--color-muted)]">
              Uses the photo from your Job News SA profile.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
