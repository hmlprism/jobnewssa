// Z83 form data types.
// Z83DraftData is stored as JSONB in z83_drafts.data — see migration 0021.
// Z83FillData extends it with session-only fields that are NEVER written to the DB.

export interface Z83SectionA {
  position: string;     // position advertised
  department: string;   // department where advertised
  ref_no: string;       // reference number from advert
  availability: string; // start date or notice period
}

export interface Z83SectionB {
  // Identity
  name: string;          // "Surname and Full names" combined — e.g. "DLAMINI Thabo Sipho"
  dob: string;           // DDMMYY — e.g. "150390" (15 March 1990)
  passport_number: string;
  // Demographics
  race: "African" | "White" | "Coloured" | "Indian" | "Other" | "";
  gender: "Male" | "Female" | "";
  disability: boolean;
  sa_citizen: boolean;
  work_permit: boolean;  // only relevant when sa_citizen is false
  // Contact
  preferred_language: string;
  communication_pref: "Post" | "Email" | "Fax" | "Tel" | "";
  contact_details: string; // address, email, fax number, or phone — matches communication_pref
  nationality: string;     // Text5
  // Experience summary
  years_private_sector: string;   // Text12
  years_public_sector: string;    // Text14
  professional_reg_date: string;  // Text15
  professional_reg_number: string; // Text16
}

// Section D: language proficiency
export interface Z83Language {
  language: string;
  read: "" | "Good" | "Fair" | "Poor";
  write: "" | "Good" | "Fair" | "Poor";
  speak: "" | "Good" | "Fair" | "Poor";
  understand: "" | "Good" | "Fair" | "Poor";
}

// Section E: qualifications (up to 4 rows in the form)
export interface Z83Qualification {
  institution: string;
  qualification: string;
  year: string;
}

// Section F: work experience (up to 3 rows in the form)
export interface Z83WorkEntry {
  employer: string;
  post: string;
  from_month: string; // "1"–"12" or ""
  from_year: string;
  to_month: string;   // "" when current position
  to_year: string;    // "" when current position
  reason: string;
}

// Section G: references (up to 3)
export interface Z83Reference {
  name: string;
  relationship: string;
  tel: string;
}

// Section B declarations — NEVER written to z83_drafts.data (see migration 0021 comments)
export interface Z83Declarations {
  criminal_conviction: boolean;
  criminal_conviction_details: string;
  pending_criminal: boolean;
  pending_criminal_details: string;
  dismissed_misconduct: boolean;
  dismissed_misconduct_details: string;
  pending_disciplinary: boolean;
  pending_disciplinary_details: string;
  resigned_pending: boolean;
  resigned_pending_details: string;
  discharged_ill_health: boolean;
  business_with_state: boolean;
  business_with_state_details: string;
  will_relinquish: boolean;
  ps_reappointment_details: string; // "If yes, provide name of previous employing dept..."
}

// ─── Persisted shape — stored in z83_drafts.data (JSONB) ─────────────────────
export interface Z83DraftData {
  section_a: Z83SectionA;
  section_b: Z83SectionB;
  section_d: Z83Language[];       // up to 5 languages
  section_e: Z83Qualification[];  // up to 4 rows
  section_e_current: string;      // "Current study institution and qualification"
  section_f: Z83WorkEntry[];      // up to 3 rows
  section_f_ps_reappointment: boolean; // Group17 Yes/No
  section_g: Z83Reference[];      // up to 3 refs
}

// ─── Complete PDF fill data — includes fields never written to DB ─────────────
export interface Z83FillData extends Z83DraftData {
  id_number: string;             // 13-digit SA ID — display-only, never persisted
  section_b_declarations: Z83Declarations;
  page1_initials: string | null; // PNG data URI from canvas ink pad, or null
  page2_initials: string | null;
  signature: string | null;      // PNG data URI — declaration signature
  declaration_date: string;      // "Date" field on page 2
}
