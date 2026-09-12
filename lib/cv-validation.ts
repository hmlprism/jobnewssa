// Shared validation functions for the CV Maker wizard.
// Pure functions — no React, no side-effects. Used by both:
//   • cv-wizard.tsx  (canProceed / stepIsValid logic)
//   • step-*.tsx     (inline field error display)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SUMMARY_MIN = 100;
export const SUMMARY_MAX = 1500;
export const BULLET_MIN = 25;
export const EDU_YEAR_MIN = 1950;
export const EDU_YEAR_MAX = 2026; // current year

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

// Standard SA phone: 10 digits starting 0, or +27 followed by 9 digits.
// Strips spaces, hyphens, dots, brackets before testing.
const PHONE_RE = /^(\+27|0)[0-9]{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HAS_DIGIT_RE = /\d/;

export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null; // optional field — blank is fine
  const stripped = phone.replace(/[\s\-().+]/g, "").replace(/^\+/, "+");
  // re-attach + for +27 numbers
  const normalised = phone.trim().startsWith("+") ? "+" + phone.trim().replace(/\D/g, "") : phone.trim().replace(/\D/g, "");
  if (!PHONE_RE.test(normalised)) {
    return "Enter a valid SA phone number: 10 digits starting with 0 (e.g. 071 234 5678), or +27 format (e.g. +27 71 234 5678).";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email address is required.";
  if (!EMAIL_RE.test(email.trim())) {
    return "Enter a valid email address (e.g. name@example.com).";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 1 — Contact
// ---------------------------------------------------------------------------

export interface ContactErrors {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
}

export function validateContact(contact: {
  name: string;
  email: string;
  phone: string;
  city: string;
}): ContactErrors {
  const errors: ContactErrors = {};
  if (!contact.name.trim()) errors.name = "Full name is required.";
  const emailErr = validateEmail(contact.email);
  if (emailErr) errors.email = emailErr;
  const phoneErr = validatePhone(contact.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (!contact.city.trim()) errors.city = "City is required.";
  return errors;
}

export function isContactValid(contact: {
  name: string;
  email: string;
  phone: string;
  city: string;
}): boolean {
  return Object.keys(validateContact(contact)).length === 0;
}

// ---------------------------------------------------------------------------
// Step 2 — Summary
// ---------------------------------------------------------------------------

export function validateSummary(summary: string): string | null {
  const trimmed = summary.trim();
  if (!trimmed) return "Please write your professional summary.";
  if (trimmed.length < SUMMARY_MIN) {
    return `Summary must be at least ${SUMMARY_MIN} characters. You have ${trimmed.length}.`;
  }
  if (summary.length > SUMMARY_MAX) {
    return `Summary must be no more than ${SUMMARY_MAX} characters. You have ${summary.length}.`;
  }
  return null;
}

export function isSummaryValid(summary: string): boolean {
  return validateSummary(summary) === null;
}

// ---------------------------------------------------------------------------
// Step 3 — Work experience
// ---------------------------------------------------------------------------

// Maps "Jan" → 0, "Dec" → 11 for chronology comparison.
const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4,  Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function dateStrToMonths(val: string): number | null {
  const [m, y] = val.trim().split(" ");
  if (!m || !y) return null;
  const mi = MONTH_INDEX[m];
  const yi = parseInt(y, 10);
  if (mi === undefined || isNaN(yi)) return null;
  return yi * 12 + mi;
}

function validateDateStr(val: string | null | undefined, label: string): string | null {
  if (!val || !val.trim()) return `${label} is required — select a month and year.`;
  const [m, y] = val.trim().split(" ");
  if (!m || !y || MONTH_INDEX[m] === undefined || !/^\d{4}$/.test(y)) {
    return `${label} must have both a month and a year selected.`;
  }
  return null;
}

function validateJobText(val: string, label: string): string | null {
  if (!val.trim()) return `${label} is required.`;
  if (HAS_DIGIT_RE.test(val)) {
    return `${label} should not contain numbers. If the name includes digits (e.g. 3M), enter the full registered name or abbreviation without the digit.`;
  }
  return null;
}

export interface WorkEntryErrors {
  title?: string;
  employer?: string;
  start?: string;
  end?: string;
  bullets?: Record<number, string>;
}

export function validateWorkEntry(entry: {
  title: string;
  employer: string;
  start: string;
  end: string | null;
  current: boolean;
  bullets: string[];
}): WorkEntryErrors {
  const errors: WorkEntryErrors = {};

  const titleErr = validateJobText(entry.title, "Job title");
  if (titleErr) errors.title = titleErr;

  const employerErr = validateJobText(entry.employer, "Employer name");
  if (employerErr) errors.employer = employerErr;

  const startErr = validateDateStr(entry.start, "Start date");
  if (startErr) errors.start = startErr;

  if (!entry.current) {
    const endErr = validateDateStr(entry.end, "End date");
    if (endErr) {
      errors.end = endErr;
    } else if (entry.start && entry.end) {
      // Chronological check
      const startMs = dateStrToMonths(entry.start);
      const endMs = dateStrToMonths(entry.end);
      if (startMs !== null && endMs !== null && endMs < startMs) {
        errors.end = "End date cannot be earlier than the start date.";
      }
    }
  }

  // Bullet validation
  const bulletErrors: Record<number, string> = {};
  let hasAnyBullet = false;
  entry.bullets.forEach((b, j) => {
    const trimmed = b.trim();
    if (trimmed) {
      hasAnyBullet = true;
      if (trimmed.length < BULLET_MIN) {
        bulletErrors[j] = `Too short (${trimmed.length} chars). Aim for at least ${BULLET_MIN} characters — describe specifically what you did or achieved.`;
      }
    }
  });
  if (!hasAnyBullet) {
    bulletErrors[0] = "Add at least one responsibility or achievement for this position.";
  }
  if (Object.keys(bulletErrors).length > 0) errors.bullets = bulletErrors;

  return errors;
}

export function isWorkValid(
  entries: Array<{
    title: string;
    employer: string;
    start: string;
    end: string | null;
    current: boolean;
    bullets: string[];
  }>
): boolean {
  if (entries.length === 0) return true;
  return entries.every((e) => Object.keys(validateWorkEntry(e)).length === 0);
}

// ---------------------------------------------------------------------------
// Step 4 — Education
// ---------------------------------------------------------------------------

export interface EduEntryErrors {
  qualification?: string;
  year?: string;
}

export function validateEduEntry(entry: {
  qualification: string;
  year: string;
}): EduEntryErrors {
  const errors: EduEntryErrors = {};

  if (!entry.qualification.trim()) {
    errors.qualification = "Qualification name is required.";
  }

  if (entry.year) {
    const y = parseInt(entry.year, 10);
    if (!/^\d{4}$/.test(entry.year) || isNaN(y)) {
      errors.year = "Enter a valid 4-digit year (e.g. 2018).";
    } else if (y < EDU_YEAR_MIN) {
      errors.year = `Year cannot be earlier than ${EDU_YEAR_MIN}.`;
    } else if (y > EDU_YEAR_MAX) {
      errors.year = `Year cannot be later than ${EDU_YEAR_MAX}.`;
    }
  }
  // Blank year is allowed — not all entries have a graduation year the user wants to show.

  return errors;
}

export function isEduValid(
  education: Array<{ qualification: string; year: string }>
): boolean {
  if (education.length === 0) return true;
  return education.every((e) => Object.keys(validateEduEntry(e)).length === 0);
}
