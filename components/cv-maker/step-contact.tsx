"use client";

import { useMemo } from "react";
import { SA_PROVINCES } from "@/types/database";
import type { CvContact } from "@/types/cv";
import { validateContact } from "@/lib/cv-validation";

interface Props {
  contact: CvContact;
  idNumber: string;
  includePhoto: boolean;
  hasAvatar: boolean;
  attempted: boolean;
  onChange: (contact: CvContact) => void;
  onIdNumberChange: (val: string) => void;
  onIncludePhotoChange: (val: boolean) => void;
}

const fieldBase =
  "w-full border bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none";
const fieldOk = `${fieldBase} border-[var(--color-line)] focus:border-[var(--color-ink)]`;
const fieldErr = `${fieldBase} border-[var(--color-rust)] focus:border-[var(--color-rust)]`;

const lbl = "block text-sm font-medium text-[var(--color-ink)] mb-1";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

export function StepContact({
  contact,
  idNumber,
  includePhoto,
  hasAvatar,
  attempted,
  onChange,
  onIdNumberChange,
  onIncludePhotoChange,
}: Props) {
  const errors = useMemo(
    () => (attempted ? validateContact(contact) : {}),
    [attempted, contact]
  );

  const set =
    (key: keyof CvContact) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...contact, [key]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cv-name" className={lbl}>
            Full name <span className="text-[var(--color-rust)]">*</span>
          </label>
          <input
            id="cv-name"
            type="text"
            autoComplete="name"
            className={errors.name ? fieldErr : fieldOk}
            placeholder="Thandi Mokoena"
            value={contact.name}
            onChange={set("name")}
          />
          <FieldError msg={errors.name} />
        </div>

        <div>
          <label htmlFor="cv-email" className={lbl}>
            Email <span className="text-[var(--color-rust)]">*</span>
          </label>
          <input
            id="cv-email"
            type="email"
            autoComplete="email"
            className={errors.email ? fieldErr : fieldOk}
            placeholder="you@email.co.za"
            value={contact.email}
            onChange={set("email")}
          />
          <FieldError msg={errors.email} />
        </div>

        <div>
          <label htmlFor="cv-phone" className={lbl}>
            Phone number
          </label>
          <input
            id="cv-phone"
            type="tel"
            autoComplete="tel"
            className={errors.phone ? fieldErr : fieldOk}
            placeholder="071 234 5678"
            value={contact.phone}
            onChange={set("phone")}
          />
          <FieldError msg={errors.phone} />
        </div>

        <div>
          <label htmlFor="cv-city" className={lbl}>
            City <span className="text-[var(--color-rust)]">*</span>
          </label>
          <input
            id="cv-city"
            type="text"
            autoComplete="address-level2"
            className={errors.city ? fieldErr : fieldOk}
            placeholder="Johannesburg"
            value={contact.city}
            onChange={set("city")}
          />
          <FieldError msg={errors.city} />
        </div>

        <div>
          <label htmlFor="cv-province" className={lbl}>
            Province
          </label>
          <select
            id="cv-province"
            className={fieldOk}
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
        </div>

        <div>
          <label htmlFor="cv-linkedin" className={lbl}>
            LinkedIn
          </label>
          <input
            id="cv-linkedin"
            type="text"
            className={fieldOk}
            placeholder="thandi-mokoena"
            value={contact.linkedin}
            onChange={set("linkedin")}
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Enter your full LinkedIn URL or just your handle (e.g. thandi-mokoena)
          </p>
        </div>
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
          className={fieldOk}
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
