// CV Maker data types.
// This shape is stored as JSONB in cv_drafts.data — do not add types here
// that reference DB enums unless you add a migration first.
// SA ID number is intentionally absent — display-only in PDF, never persisted.

export interface CvContact {
  name: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  linkedin: string; // full URL or handle; empty string = omit
}

export interface CvWorkEntry {
  employer: string;
  title: string;
  start: string;     // "Jan 2022" or "2022"
  end: string | null; // null when current = true
  current: boolean;
  bullets: string[]; // 1–4 responsibility/achievement lines
}

export interface CvEducationEntry {
  institution: string;
  qualification: string; // e.g. "Bachelor of Commerce"
  year: string;          // graduation year, e.g. "2018"
  nqf_level: string;     // e.g. "7" — optional, may be empty string
}

export interface CvSkills {
  technical: string[]; // comma-separated or array of strings
  soft: string[];
}

export interface CvData {
  contact: CvContact;
  summary: string;
  work_experience: CvWorkEntry[];
  education: CvEducationEntry[];
  skills: CvSkills;
  references_on_request: boolean;
  template: "broadsheet";
  include_photo: boolean;
  // display-only fields — these reach the PDF template but are not in cv_drafts.data
  photo_url?: string | null;  // fetched server-side from profiles.avatar_url
  id_number?: string;         // typed in form, never written to DB
}
