/**
 * DPSA Public Service Vacancy Circular parser.
 *
 * Takes structured TextLine[] from dpsa-pdf.ts and produces an array of
 * DpsaPost objects ready to upsert into the jobs table.
 *
 * Document hierarchy:
 *   Circular (PUBLICATION NO 33 OF 2026)
 *     └─ Annexure section (ANNEXURE A … ANNEXURE T)
 *           └─ Department block (shared APPLICATIONS / CLOSING DATE / NOTE)
 *                 └─ Individual POST entry (POST 33/01 … POST 33/252)
 */

import type { TextLine } from "./dpsa-pdf";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type DpsaContractType = "permanent" | "contract" | "internship";

export interface DpsaPost {
  post_number: string; // "33/01"
  ref_no: string; // "3/3/1/83/2026"  — used as external_id
  title: string; // "STATE VETERINARIAN"
  department: string; // "DEPARTMENT OF AGRICULTURE"
  salary_raw: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_level: number | null; // DPSA salary level (1–16)
  centre_raw: string;
  province: string | null;
  city: string | null;
  requirements: string;
  duties: string;
  contract_type: DpsaContractType;
  closing_date_raw: string;
  expires_at: string | null; // ISO 8601 datetime string (SAST = UTC+2)
  apply_address: string;
  enquiries: string;
  circular_ref: string; // "33 of 2026"
}

export interface DpsaParseResult {
  posts: DpsaPost[];
  circular_ref: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const CITY_TO_PROVINCE: Record<string, string> = {
  Pretoria: "Gauteng",
  Tshwane: "Gauteng",
  Johannesburg: "Gauteng",
  Sandton: "Gauteng",
  Soweto: "Gauteng",
  Centurion: "Gauteng",
  Midrand: "Gauteng",
  "Cape Town": "Western Cape",
  Stellenbosch: "Western Cape",
  George: "Western Cape",
  Paarl: "Western Cape",
  Worcester: "Western Cape",
  Durban: "KwaZulu-Natal",
  "eThekwini": "KwaZulu-Natal",
  Pietermaritzburg: "KwaZulu-Natal",
  Richards: "KwaZulu-Natal",
  Bloemfontein: "Free State",
  Welkom: "Free State",
  "East London": "Eastern Cape",
  Bhisho: "Eastern Cape",
  Mthatha: "Eastern Cape",
  "Port Elizabeth": "Eastern Cape",
  Gqeberha: "Eastern Cape",
  Polokwane: "Limpopo",
  Thohoyandou: "Limpopo",
  Nelspruit: "Mpumalanga",
  Mbombela: "Mpumalanga",
  Kimberley: "Northern Cape",
  Upington: "Northern Cape",
  Mahikeng: "North West",
  Rustenburg: "North West",
  Potchefstroom: "North West",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parseSalary(raw: string): {
  min: number | null;
  max: number | null;
  level: number | null;
} {
  // Match all "R<digits with optional spaces>" patterns
  const amounts = Array.from(raw.matchAll(/R\s*([\d\s]+)/g))
    .map((m) => parseInt(m[1].replace(/\s+/g, ""), 10))
    .filter((n) => !isNaN(n) && n > 10_000 && n < 20_000_000);

  const levelMatch = raw.match(/Level\s+(\d+)/i);
  const level = levelMatch ? parseInt(levelMatch[1], 10) : null;

  if (amounts.length === 0) return { min: null, max: null, level };
  if (amounts.length === 1) return { min: amounts[0], max: amounts[0], level };
  return { min: Math.min(...amounts), max: Math.max(...amounts), level };
}

function parseCentre(raw: string): {
  province: string | null;
  city: string | null;
} {
  const firstLine = raw.split(/\n/)[0].trim();

  // "Mpumalanga: Skukuza" or "KwaZulu-Natal: Durban"
  const colonIdx = firstLine.indexOf(":");
  if (colonIdx > 0) {
    const left = firstLine.slice(0, colonIdx).trim();
    const right = firstLine.slice(colonIdx + 1).trim().split(",")[0].trim();
    const matchedProvince = SA_PROVINCES.find(
      (p) => p.toLowerCase() === left.toLowerCase(),
    );
    if (matchedProvince) {
      return { province: matchedProvince, city: right || null };
    }
  }

  // Look for a known province name anywhere in the raw text
  const upperRaw = raw.toUpperCase();
  for (const province of SA_PROVINCES) {
    if (upperRaw.includes(province.toUpperCase())) {
      // Try to extract a city from the first segment before the province
      const city =
        firstLine.split(/[,:(]/)[0].trim().replace(province, "").trim() || null;
      return { province, city: city || null };
    }
  }

  // Known city → province mapping
  for (const [city, province] of Object.entries(CITY_TO_PROVINCE)) {
    if (new RegExp(`\\b${city}\\b`, "i").test(raw)) {
      return { province, city };
    }
  }

  // Take first meaningful segment as the city
  const city = firstLine.split(/[,(]/)[0].trim() || null;
  return { province: null, city };
}

function parseClosingDate(raw: string): string | null {
  const MONTHS: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  const match = raw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = MONTHS[match[2].toLowerCase()];
  const year = parseInt(match[3], 10);
  if (!month) return null;

  // Default close time is 16:00 SAST; extract if present
  const timeMatch = raw.match(/(\d{2}):(\d{2})/);
  const hh = timeMatch ? timeMatch[1] : "16";
  const mm = timeMatch ? timeMatch[2] : "00";

  return (
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` +
    `T${hh}:${mm}:00+02:00`
  );
}

function extractRefNo(titleRaw: string): { title: string; ref_no: string } {
  // Patterns: "REF NO: ABC/123/2026" or "REF: ABC" or just embedded in text
  const match = titleRaw.match(
    /\bREF\s*(?:NO)?[.:]\s*([A-Z0-9\/\-_]+(?:\s+[A-Z0-9\/\-_]+){0,2})/i,
  );
  if (match) {
    // Everything before "REF" is the title; strip trailing punctuation.
    // The 'i' flag on the regex makes [A-Z0-9] match lowercase too, so
    // mixed-case words like "Directorate" can bleed into the capture group.
    // Strip any trailing word that starts uppercase-then-lowercase.
    const ref_no = normWhitespace(match[1])
      .replace(/\s+[A-Z][a-z].*$/, "")
      .trim();
    const title = normWhitespace(
      titleRaw.slice(0, titleRaw.toLowerCase().indexOf("ref")).replace(/[:\s]+$/, ""),
    );
    return { title, ref_no };
  }
  return { title: normWhitespace(titleRaw), ref_no: "" };
}

function detectContractType(
  titleRaw: string,
  salaryRaw: string,
  noteText: string,
): DpsaContractType {
  const combined = `${titleRaw} ${salaryRaw} ${noteText}`.toLowerCase();
  if (/\b(internship|learnership|graduate|bursary|student)\b/.test(combined))
    return "internship";
  if (
    /\b(fixed[- ]term|contract|temporary|months?\s+contract|till\s+\d|contract\s+till)\b/.test(
      combined,
    )
  )
    return "contract";
  return "permanent";
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type ParsePhase = "PREAMBLE" | "DEPT_HEADER" | "IN_SECTION" | "IN_POST";

type ActiveField =
  | "title"
  | "salary"
  | "centre"
  | "requirements"
  | "duties"
  | "enquiries"
  | "section_applications"
  | "section_closing_date"
  | "section_note"
  | null;

interface ParseState {
  phase: ParsePhase;
  circular_ref: string;
  dept: string;
  // Section-level context (inherited by all posts in this section)
  sectionApplications: string;
  sectionClosingDate: string;
  sectionNote: string;
  // Current post being built
  post: Partial<{
    post_number: string;
    title_raw: string;
    salary_raw: string;
    centre_raw: string;
    requirements: string;
    duties: string;
    enquiries: string;
    // per-post overrides of section fields:
    apply_address: string;
    closing_date_raw: string;
  }> | null;
  activeField: ActiveField;
  // Results
  posts: DpsaPost[];
  warnings: string[];
}

function appendToField(
  state: ParseState,
  text: string,
): void {
  if (!state.activeField || !text) return;

  const sep = " ";

  switch (state.activeField) {
    case "title":
      if (state.post) {
        state.post.title_raw = (state.post.title_raw ?? "") + sep + text;
      }
      break;
    case "salary":
      if (state.post) {
        state.post.salary_raw = (state.post.salary_raw ?? "") + sep + text;
      }
      break;
    case "centre":
      if (state.post) {
        // Multi-location: use newline separator for CENTRE continuations
        state.post.centre_raw =
          (state.post.centre_raw ?? "") + "\n" + text;
      }
      break;
    case "requirements":
      if (state.post) {
        state.post.requirements = (state.post.requirements ?? "") + sep + text;
      }
      break;
    case "duties":
      if (state.post) {
        state.post.duties = (state.post.duties ?? "") + sep + text;
      }
      break;
    case "enquiries":
      if (state.post) {
        state.post.enquiries = (state.post.enquiries ?? "") + sep + text;
      }
      break;
    case "section_applications":
      state.sectionApplications += sep + text;
      if (state.post) state.post.apply_address = state.sectionApplications.trim();
      break;
    case "section_closing_date":
      state.sectionClosingDate += sep + text;
      if (state.post)
        state.post.closing_date_raw = state.sectionClosingDate.trim();
      break;
    case "section_note":
      state.sectionNote += sep + text;
      break;
  }
}

function flushPost(state: ParseState): void {
  if (!state.post) return;

  const p = state.post;
  if (!p.post_number || !p.title_raw) {
    // Incomplete post — discard
    state.post = null;
    return;
  }

  const { title, ref_no } = extractRefNo(p.title_raw ?? "");

  const salary_raw = normWhitespace(p.salary_raw ?? "");
  const { min, max, level } = parseSalary(salary_raw);

  const centre_raw = normWhitespace(p.centre_raw ?? "");
  const { province, city } = parseCentre(centre_raw);

  const closing_date_raw = normWhitespace(
    p.closing_date_raw ?? state.sectionClosingDate,
  );
  const apply_address = normWhitespace(
    p.apply_address ?? state.sectionApplications,
  );

  state.posts.push({
    post_number: p.post_number,
    ref_no,
    title: title || normWhitespace(p.title_raw ?? ""),
    department: state.dept,
    salary_raw,
    salary_min: min,
    salary_max: max,
    salary_level: level,
    centre_raw,
    province,
    city,
    requirements: normWhitespace(p.requirements ?? ""),
    duties: normWhitespace(p.duties ?? ""),
    contract_type: detectContractType(
      p.title_raw ?? "",
      salary_raw,
      state.sectionNote,
    ),
    closing_date_raw,
    expires_at: parseClosingDate(closing_date_raw),
    apply_address,
    enquiries: normWhitespace(p.enquiries ?? ""),
    circular_ref: state.circular_ref,
  });

  state.post = null;
  state.activeField = null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseCircular(
  lines: TextLine[],
  circularRef: string,
): DpsaParseResult {
  const state: ParseState = {
    phase: "PREAMBLE",
    circular_ref: circularRef,
    dept: "",
    sectionApplications: "",
    sectionClosingDate: "",
    sectionNote: "",
    post: null,
    activeField: null,
    posts: [],
    warnings: [],
  };

  for (const line of lines) {
    const label = line.label.trim();
    const content = normWhitespace(line.content);

    // ------------------------------------------------------------------
    // Detect ANNEXURE headers — either as a label or in right-column text.
    // In the PDF, "ANNEXURE A" appears right-aligned (x≈464), so it arrives
    // as content.  A few annexures may be centred and also appear as content.
    // ------------------------------------------------------------------
    const isAnnexure =
      /^ANNEXURE\s+[A-T]$/i.test(label) ||
      /^ANNEXURE\s+[A-T](\b|$)/i.test(content);

    if (isAnnexure) {
      flushPost(state);
      // Reset section context for the new department
      state.sectionApplications = "";
      state.sectionClosingDate = "";
      state.sectionNote = "";
      state.dept = "";
      state.phase = "DEPT_HEADER";
      state.activeField = null;
      continue;
    }

    // ------------------------------------------------------------------
    // Detect department name while in DEPT_HEADER phase.
    // The department name is the first substantive content line after
    // ANNEXURE that looks like a department / provincial admin name.
    // ------------------------------------------------------------------
    if (state.phase === "DEPT_HEADER" && !label && content) {
      // Department names in DPSA circulars are in ALL CAPS.
      // Accept the first mostly-uppercase content line (≥ 75% of alpha chars
      // are uppercase) that is not too short/long and not pure boilerplate.
      const letters = content.replace(/[^A-Za-z]/g, "");
      const upperRatio =
        letters.length > 0
          ? letters.split("").filter((c) => c === c.toUpperCase()).length /
            letters.length
          : 0;
      const looksLikeDept =
        letters.length >= 5 &&
        content.length <= 160 &&
        upperRatio >= 0.75 &&
        !/^(APPLICATIONS?\s+MUST|CLOSING\s+DATE|NOTE\s*:|EQUAL\s+OPPORTUNITY|AFFIRMATIVE\s+ACTION|ALL\s+RACE\s+GROUPS|CANDIDATES?\s+WHO)/i.test(
          content,
        );
      if (looksLikeDept) {
        state.dept = content;
        state.phase = "IN_SECTION";
        state.activeField = null;
      }
      // Whether or not we matched, keep consuming lines in DEPT_HEADER
      continue;
    }

    // ------------------------------------------------------------------
    // Field label handlers
    // ------------------------------------------------------------------

    // POST XX/NNN — starts a new vacancy entry
    if (/^POST\s+\d+\/\d+$/i.test(label)) {
      flushPost(state);
      state.post = {
        post_number: label.replace(/^POST\s+/i, "").trim(),
        title_raw: content,
        // Inherit section-level fields
        closing_date_raw: state.sectionClosingDate,
        apply_address: state.sectionApplications,
      };
      state.activeField = "title";
      state.phase = "IN_POST";
      continue;
    }

    if (/^SALARY$/i.test(label)) {
      if (state.post) {
        state.post.salary_raw = content;
        state.activeField = "salary";
      }
      continue;
    }

    if (/^CENTRE$/i.test(label)) {
      if (state.post) {
        state.post.centre_raw = content;
        state.activeField = "centre";
      }
      continue;
    }

    if (/^REQUIREMENTS?$/i.test(label)) {
      if (state.post) {
        state.post.requirements = content;
        state.activeField = "requirements";
      }
      continue;
    }

    if (/^DUTIES$/i.test(label)) {
      if (state.post) {
        state.post.duties = content;
        state.activeField = "duties";
      }
      continue;
    }

    if (/^ENQUI[EI]?R[EI]ES?$/i.test(label)) {
      if (state.post) {
        state.post.enquiries = content;
        state.activeField = "enquiries";
      }
      continue;
    }

    if (/^APPLICATIONS?$/i.test(label)) {
      // Section-level: all subsequent posts inherit this address.
      state.sectionApplications = content;
      state.activeField = "section_applications";
      if (state.post) state.post.apply_address = content;
      continue;
    }

    if (/^CLOSING\s+DATE$/i.test(label)) {
      state.sectionClosingDate = content;
      state.activeField = "section_closing_date";
      if (state.post) state.post.closing_date_raw = content;
      continue;
    }

    if (/^NOTE$/i.test(label)) {
      state.sectionNote = content;
      state.activeField = "section_note";
      continue;
    }

    if (/^FOR\s+ATTENTION$/i.test(label)) {
      // FOR ATTENTION is part of APPLICATION info — append to apply_address
      if (content) {
        state.sectionApplications += ` For attention: ${content}`;
        if (state.post)
          state.post.apply_address = state.sectionApplications.trim();
      }
      state.activeField = "section_applications";
      continue;
    }

    if (/^STIPEND$/i.test(label)) {
      // Treat like SALARY for learnerships
      if (state.post) {
        state.post.salary_raw = content;
        state.activeField = "salary";
      }
      continue;
    }

    // ------------------------------------------------------------------
    // Continuation lines (no label) — append to the active field.
    // ------------------------------------------------------------------
    if (!label && content) {
      appendToField(state, content);
    }
  }

  // Flush the last post after the final line.
  flushPost(state);

  return {
    posts: state.posts,
    circular_ref: circularRef,
    warnings: state.warnings,
  };
}
