// Server-only: reads the Z83 template PDF and fills all AcroForm fields.
// Call only from API routes — uses readFileSync and pdf-lib.
//
// Field names are the exact AcroForm keys from the official DPSA Z83 template
// (public/forms/z83-template.pdf). Run scripts/z83-field-map.mjs to re-verify
// if the template PDF is ever replaced.
//
// Radio button option values (opaque "ChoiceN" strings) were resolved by
// comparing widget X positions against pdfjs-dist text-label positions.

import { readFileSync } from "fs";
import { join } from "path";
import { PDFDocument, PDFPage } from "pdf-lib";
import type { Z83FillData } from "@/types/z83";

// ─── Radio button value maps ──────────────────────────────────────────────────

// Group2 — Race
const RACE_CHOICE: Record<string, string> = {
  African: "Choice1",
  White: "Choice2",
  Coloured: "Choice3",
  Indian: "Choice4",
  Other: "Choice5",
};

// Group3 — Gender (AcroForm widget order is reversed: Male=Choice7 at higher X)
const GENDER_CHOICE: Record<string, string> = {
  Male: "Choice7",
  Female: "Choice6",
};

// Group4–Group14 — all standard Yes/No groups
// Choice6 = Yes (left/first widget), Choice7 = No (right/second widget)
// Returns "" for null (unanswered) — the radio helper skips empty strings, leaving the field blank.
function yesNo(val: boolean | null): string {
  if (val === null) return "";
  return val ? "Choice6" : "Choice7";
}

// Group16 — Communication preference
const COMM_CHOICE: Record<string, string> = {
  Post: "Choice1",
  Email: "Choice2",
  Fax: "Choice3",
  Tel: "Choice4",
};

// Group17 — PS re-appointment (widget order reversed from other Yes/No groups)
// Choice1 = Yes, Choice2 = No — returns "" for null (unanswered).
function psReapp(val: boolean | null): string {
  if (val === null) return "";
  return val ? "Choice1" : "Choice2";
}

// ─── Field name arrays (Sections D, E, F, G) ─────────────────────────────────

const LANG_NAME_FIELDS = [
  "Languages specifyRow1",
  "Languages specifyRow1_2",
  "Languages specifyRow1_3",
  "Languages specifyRow1_4",
  "Languages specifyRow1_5",
];

// Proficiency columns per language row: Dropdown3.{langRow}.{colIdx}
// colIdx 0=Read, 1=Write, 2=Speak, 3=Understand
// The PDF only has 2 proficiency rows — languages 3-5 receive a name only.
const PROF_KEYS = ["read", "write", "speak", "understand"] as const;

const EDU_INSTITUTION = [
  "Name of SchoolTechnical CollegeRow1",
  "Name of SchoolTechnical CollegeRow2",
  "Name of SchoolTechnical CollegeRow3",
  "Name of SchoolTechnical CollegeRow4",
];
const EDU_QUAL = [
  "Name of qualification obtainedRow1",
  "Name of qualification obtainedRow2",
  "Name of qualification obtainedRow3",
  "Name of qualification obtainedRow4",
];
const EDU_YEAR = [
  "Year obtainedRow1",
  "Year obtainedRow2",
  "Year obtainedRow3",
  "Year obtainedRow4",
];

const WORK_EMPLOYER = [
  "Employer including current employerRow1",
  "Employer including current employerRow2",
  "Employer including current employerRow3",
];
const WORK_POST = ["Post heldRow1", "Post heldRow2", "Post heldRow3"];
const WORK_FROM_YEAR = ["YYRow1", "YYRow2", "YYRow3"];
const WORK_TO_YEAR = ["YYRow1_2", "YYRow2_2", "YYRow3_2"];
const WORK_REASON = [
  "Reason for leavingRow1",
  "Reason for leavingRow2",
  "Reason for leavingRow3",
];

// Month dropdowns: Dropdown1.{row}.0 = from month, Dropdown1.{row}.1 = to month
// NOTE: the AcroForm lists row 2's fields as Dropdown1.2.1 before Dropdown1.2.0 —
// an authoring quirk in the original PDF. Values are still set by name, so the
// visual result should be correct. Verify against the sample PDF.

const REF_NAME = ["NameRow1", "NameRow2", "NameRow3"];
const REF_REL = [
  "Relationship to youRow1",
  "Relationship to youRow2",
  "Relationship to youRow3",
];
const REF_TEL = [
  "Tel No office hoursRow1",
  "Tel No office hoursRow2",
  "Tel No office hoursRow3",
];

// ─── Fill function ────────────────────────────────────────────────────────────

export async function fillZ83(data: Z83FillData): Promise<Uint8Array> {
  const templateBytes = readFileSync(
    join(process.cwd(), "public", "forms", "z83-template.pdf")
  );
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  // Helpers — silent on error so one bad value never aborts the PDF
  const radio = (name: string, val: string) => {
    if (!val) return;
    try { form.getRadioGroup(name).select(val); } catch { /* invalid option */ }
  };
  const dd = (name: string, val: string) => {
    if (!val) return;
    try { form.getDropdown(name).select(val); } catch { /* invalid option */ }
  };
  const tx = (name: string, val: string | undefined | null) => {
    try { form.getTextField(name).setText(val ?? ""); } catch { /* field not found */ }
  };

  // ── Section A ──────────────────────────────────────────────────────────────
  tx("Position for which you are applying as advertised", data.section_a.position);
  tx("Department where the position was advertised", data.section_a.department);
  tx("Reference number as stated in the advert", data.section_a.ref_no);
  tx(
    "If you are offered the position when can you start OR how much notice must you serve with your current employer",
    data.section_a.availability
  );

  // ── Section B — Identity & Demographics ──────────────────────────────────
  tx("Surname and Full names", data.section_b.name);
  tx("Surname and Full names_2", data.section_b.name); // same name repeated on page 2
  tx("DDMMYY", data.dob);           // display-only — never stored in DB
  tx("Identity Number", data.id_number); // display-only — never stored in DB
  tx("Passport2 number", data.section_b.passport_number);
  tx("Preferred language for correspondence", data.section_b.preferred_language);
  tx("Contact details in terms of the above", data.section_b.contact_details);

  if (data.section_b.race) radio("Group2", RACE_CHOICE[data.section_b.race] ?? "");
  if (data.section_b.gender) radio("Group3", GENDER_CHOICE[data.section_b.gender] ?? "");
  radio("Group4", yesNo(data.section_b.disability));
  radio("Group5", yesNo(data.section_b.sa_citizen));
  if (!data.section_b.sa_citizen) radio("Group6", yesNo(data.section_b.work_permit));
  if (data.section_b.communication_pref)
    radio("Group16", COMM_CHOICE[data.section_b.communication_pref] ?? "");

  tx("Text5", data.section_b.nationality);         // Nationality
  tx("Text12", data.section_b.years_private_sector);
  tx("Text14", data.section_b.years_public_sector);
  tx("Text15", data.section_b.professional_reg_date);
  tx("Text16", data.section_b.professional_reg_number);

  // ── Section B — Declarations (never stored in DB) ─────────────────────────
  const decl = data.section_b_declarations;
  radio("Group7", yesNo(decl.criminal_conviction));
  tx("Text6", decl.criminal_conviction_details);
  radio("Group8", yesNo(decl.pending_criminal));
  tx("Text7", decl.pending_criminal_details);
  radio("Group9", yesNo(decl.dismissed_misconduct));
  tx("Text8", decl.dismissed_misconduct_details);
  radio("Group10", yesNo(decl.pending_disciplinary));
  tx("Text9", decl.pending_disciplinary_details);
  radio("Group11", yesNo(decl.resigned_pending));
  tx("Text10", decl.resigned_pending_details);
  radio("Group12", yesNo(decl.discharged_ill_health));
  radio("Group13", yesNo(decl.business_with_state));
  tx("Text11", decl.business_with_state_details);
  radio("Group14", yesNo(decl.will_relinquish));

  // ── Section D — Language proficiency ──────────────────────────────────────
  data.section_d.slice(0, 5).forEach((lang, i) => {
    tx(LANG_NAME_FIELDS[i], lang.language);
    if (i < 2) {
      // Only rows 0 and 1 have proficiency dropdowns in this PDF
      PROF_KEYS.forEach((key, col) => {
        const val = lang[key];
        if (val) dd(`Dropdown3.${i}.${col}`, val);
      });
    }
  });

  // ── Section E — Qualifications ────────────────────────────────────────────
  data.section_e.slice(0, 4).forEach((edu, i) => {
    tx(EDU_INSTITUTION[i], edu.institution);
    tx(EDU_QUAL[i], edu.qualification);
    tx(EDU_YEAR[i], edu.year);
  });
  tx("Current study institution and qualification", data.section_e_current);

  // ── Section F — Work experience ──────────────────────────────────────────
  data.section_f.slice(0, 3).forEach((work, i) => {
    tx(WORK_EMPLOYER[i], work.employer);
    tx(WORK_POST[i], work.post);
    tx(WORK_FROM_YEAR[i], work.from_year);
    tx(WORK_TO_YEAR[i], work.to_year);
    tx(WORK_REASON[i], work.reason);
    dd(`Dropdown1.${i}.0`, work.from_month);
    dd(`Dropdown1.${i}.1`, work.to_month);
  });
  radio("Group17", psReapp(data.section_f_ps_reappointment));
  tx(
    "If yes Provide the name of the previous employing department and indicate the nature of the condition",
    decl.ps_reappointment_details
  );

  // ── Section G — References ────────────────────────────────────────────────
  data.section_g.slice(0, 3).forEach((ref, i) => {
    tx(REF_NAME[i], ref.name);
    tx(REF_REL[i], ref.relationship);
    tx(REF_TEL[i], ref.tel);
  });

  // ── Declaration date ──────────────────────────────────────────────────────
  tx("Date", data.declaration_date);

  // ── Flatten: embeds all field appearances into content streams ────────────
  // Must happen before signature overlays — post-flatten pages are plain content.
  form.flatten();

  // ── Signature image overlays ──────────────────────────────────────────────
  // PNG data URIs from the canvas ink pad are drawn at the exact coordinates
  // confirmed via pdfjs-dist widget position analysis (PDF points, origin = bottom-left).
  const pages = pdfDoc.getPages();

  async function overlayPng(
    page: PDFPage,
    dataUri: string | null,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (!dataUri) return;
    const bytes = Buffer.from(
      dataUri.replace(/^data:image\/png;base64,/, ""),
      "base64"
    );
    const img = await pdfDoc.embedPng(bytes);
    page.drawImage(img, { x, y, width, height });
  }

  // Text1 — page 1 initials:  x=542 y=11  w=60 h=22
  await overlayPng(pages[0], data.page1_initials, 542, 11, 60, 22);
  // Initials — page 2 initials: x=541 y=18  w=60 h=22
  await overlayPng(pages[1], data.page2_initials, 541, 18, 60, 22);
  // Signature — declaration:   x=129 y=78  w=176 h=18
  await overlayPng(pages[1], data.signature, 129, 78, 176, 18);

  return pdfDoc.save();
}

// ─── Audit function (QA — dev use only) ──────────────────────────────────────
// Fills the form field-by-field, reads every value back via pdf-lib, and returns
// a plain-text report. Covers all 100 AcroForm fields across all sections.
// Used by GET /api/tools/z83/sample?summary=1.

export async function auditZ83(data: Z83FillData): Promise<string> {
  const templateBytes = readFileSync(
    join(process.cwd(), "public", "forms", "z83-template.pdf")
  );
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const lines: string[] = [];

  // ── helpers ────────────────────────────────────────────────────────────────
  function ok(expected: string, got: string): string {
    return expected === got ? "✓" : `✗  MISMATCH — expected "${expected}", got "${got}"`;
  }

  function tx(label: string, fieldName: string, setValue: string) {
    try {
      form.getTextField(fieldName).setText(setValue);
      const got = form.getTextField(fieldName).getText() ?? "";
      // Truncate long values in the report for readability
      const display = setValue.length > 60 ? setValue.slice(0, 60) + "…" : setValue;
      lines.push(`  ${label}: "${display}" ${ok(setValue, got)}`);
    } catch (e) {
      lines.push(`  ${label}: ERROR — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function radioReport(
    label: string,
    groupName: string,
    choiceValue: string,
    humanLabel: string
  ) {
    if (!choiceValue) {
      lines.push(`  ${label}: [skipped — no value]`);
      return;
    }
    try {
      form.getRadioGroup(groupName).select(choiceValue);
      const got = form.getRadioGroup(groupName).getSelected() ?? "";
      lines.push(
        `  ${label} (${groupName}): ${humanLabel} → set "${choiceValue}" → read "${got}" ${ok(choiceValue, got)}`
      );
    } catch (e) {
      lines.push(`  ${label}: ERROR — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function ddReport(label: string, fieldName: string, setValue: string, xCenter?: number) {
    const xNote = xCenter !== undefined ? ` [xCenter=${xCenter}]` : "";
    if (!setValue) {
      lines.push(`  ${label} (${fieldName})${xNote}: [empty — not set]`);
      return;
    }
    try {
      form.getDropdown(fieldName).select(setValue);
      const sel = form.getDropdown(fieldName).getSelected();
      const got = sel.length > 0 ? sel[0] : "";
      lines.push(
        `  ${label} (${fieldName})${xNote}: set "${setValue}" → read "${got}" ${ok(setValue, got)}`
      );
    } catch (e) {
      lines.push(`  ${label}: ERROR — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Section A ──────────────────────────────────────────────────────────────
  lines.push(`=== SECTION A — Job Specifics ===`);
  tx(`Position`, `Position for which you are applying as advertised`, data.section_a.position);
  tx(`Department`, `Department where the position was advertised`, data.section_a.department);
  tx(`Reference No`, `Reference number as stated in the advert`, data.section_a.ref_no);
  tx(
    `Availability`,
    `If you are offered the position when can you start OR how much notice must you serve with your current employer`,
    data.section_a.availability
  );
  lines.push(``);

  // ── Section B — Identity ───────────────────────────────────────────────────
  lines.push(`=== SECTION B — Identity ===`);
  tx(`Name (page 1 field)`, `Surname and Full names`, data.section_b.name);
  tx(`Name (page 2 field)`, `Surname and Full names_2`, data.section_b.name);
  tx(`Date of Birth (DDMMYY) [display-only, NEVER stored]`, `DDMMYY`, data.dob);
  tx(`ID Number [display-only, NEVER stored]`, `Identity Number`, data.id_number);
  tx(`Passport Number`, `Passport2 number`, data.section_b.passport_number);
  tx(`Preferred Language`, `Preferred language for correspondence`, data.section_b.preferred_language);
  tx(`Contact Details`, `Contact details in terms of the above`, data.section_b.contact_details);
  tx(`Nationality (Text5)`, `Text5`, data.section_b.nationality);
  tx(`Years Private Sector (Text12)`, `Text12`, data.section_b.years_private_sector);
  tx(`Years Public Sector (Text14)`, `Text14`, data.section_b.years_public_sector);
  tx(`Prof Reg Date (Text15)`, `Text15`, data.section_b.professional_reg_date);
  tx(`Prof Reg Number (Text16)`, `Text16`, data.section_b.professional_reg_number);
  lines.push(``);

  // ── Section B — Demographics ───────────────────────────────────────────────
  lines.push(`=== SECTION B — Demographics (Radio Groups) ===`);
  const raceChoice = data.section_b.race ? (RACE_CHOICE[data.section_b.race] ?? "") : "";
  radioReport(`Race`, `Group2`, raceChoice, `${data.section_b.race}`);

  const genderChoice = data.section_b.gender ? (GENDER_CHOICE[data.section_b.gender] ?? "") : "";
  radioReport(`Gender`, `Group3`, genderChoice, `${data.section_b.gender}`);
  lines.push(`    NOTE: Group3 widget order is reversed — Male=Choice7 (right/higher-X), Female=Choice6`);

  radioReport(`Disability`, `Group4`, yesNo(data.section_b.disability), data.section_b.disability ? "Yes" : "No");
  radioReport(`SA Citizen`, `Group5`, yesNo(data.section_b.sa_citizen), data.section_b.sa_citizen ? "Yes" : "No");

  if (!data.section_b.sa_citizen) {
    radioReport(`Work Permit`, `Group6`, yesNo(data.section_b.work_permit), data.section_b.work_permit ? "Yes" : "No");
  } else {
    lines.push(`  Work Permit (Group6): [skipped — applicant is SA citizen]`);
  }

  const commChoice = data.section_b.communication_pref
    ? (COMM_CHOICE[data.section_b.communication_pref] ?? "")
    : "";
  radioReport(`Communication Pref`, `Group16`, commChoice, `${data.section_b.communication_pref}`);
  lines.push(``);

  // ── Section B — Declarations ───────────────────────────────────────────────
  lines.push(`=== SECTION B — Declarations [NEVER stored in DB] ===`);
  const decl = data.section_b_declarations;
  const yn = (v: boolean | null) => v === null ? "[not answered]" : v ? "YES" : "No";
  radioReport(`Criminal Conviction`, `Group7`, yesNo(decl.criminal_conviction), yn(decl.criminal_conviction));
  tx(`  Details (Text6)`, `Text6`, decl.criminal_conviction_details);
  radioReport(`Pending Criminal Charges`, `Group8`, yesNo(decl.pending_criminal), yn(decl.pending_criminal));
  tx(`  Details (Text7)`, `Text7`, decl.pending_criminal_details);
  radioReport(`Dismissed for Misconduct`, `Group9`, yesNo(decl.dismissed_misconduct), yn(decl.dismissed_misconduct));
  tx(`  Details (Text8)`, `Text8`, decl.dismissed_misconduct_details);
  radioReport(`Pending Disciplinary`, `Group10`, yesNo(decl.pending_disciplinary), yn(decl.pending_disciplinary));
  tx(`  Details (Text9)`, `Text9`, decl.pending_disciplinary_details);
  radioReport(`Resigned Pending Verdict`, `Group11`, yesNo(decl.resigned_pending), yn(decl.resigned_pending));
  tx(`  Details (Text10)`, `Text10`, decl.resigned_pending_details);
  radioReport(`Discharged Ill-Health`, `Group12`, yesNo(decl.discharged_ill_health), yn(decl.discharged_ill_health));
  radioReport(`Business with State`, `Group13`, yesNo(decl.business_with_state), yn(decl.business_with_state));
  tx(`  Details (Text11)`, `Text11`, decl.business_with_state_details);
  radioReport(`Will Relinquish Business`, `Group14`, yesNo(decl.will_relinquish), yn(decl.will_relinquish));
  lines.push(``);

  // ── Section D — Language proficiency ──────────────────────────────────────
  lines.push(`=== SECTION D — Language Proficiency ===`);
  lines.push(`  [PDF has proficiency dropdowns for rows 1-2 only; rows 3-5 = name text field only]`);
  data.section_d.slice(0, 5).forEach((lang, i) => {
    lines.push(`  Language ${i + 1}:`);
    tx(`    Name`, LANG_NAME_FIELDS[i], lang.language);
    if (i < 2) {
      PROF_KEYS.forEach((key, col) => {
        ddReport(
          `    ${key.charAt(0).toUpperCase() + key.slice(1)}`,
          `Dropdown3.${i}.${col}`,
          lang[key]
        );
      });
    }
  });
  lines.push(``);

  // ── Section E — Qualifications ─────────────────────────────────────────────
  lines.push(`=== SECTION E — Qualifications ===`);
  data.section_e.slice(0, 4).forEach((edu, i) => {
    lines.push(`  Row ${i + 1}:`);
    tx(`    Institution`, EDU_INSTITUTION[i], edu.institution);
    tx(`    Qualification`, EDU_QUAL[i], edu.qualification);
    tx(`    Year`, EDU_YEAR[i], edu.year);
  });
  tx(`  Current Study`, `Current study institution and qualification`, data.section_e_current);
  lines.push(``);

  // ── Section F — Work experience ────────────────────────────────────────────
  lines.push(`=== SECTION F — Work Experience ===`);
  lines.push(`  Column geometry (confirmed via widget X-position analysis):`);
  lines.push(`    FROM month  Dropdown1.x.0  xCenter=324.1 — LEFT column`);
  lines.push(`    FROM year   YYRow{n}        xCenter=355.7`);
  lines.push(`    TO month    Dropdown1.x.1  xCenter=385.0 — RIGHT column`);
  lines.push(`    TO year     YYRow{n}_2      xCenter=419.0`);
  lines.push(`    Gap FROM-year → TO-month = 29pt — visually narrow; data is in correct columns.`);
  lines.push(``);
  data.section_f.slice(0, 3).forEach((work, i) => {
    lines.push(`  Row ${i + 1}:`);
    tx(`    Employer`, WORK_EMPLOYER[i], work.employer);
    tx(`    Post`, WORK_POST[i], work.post);
    ddReport(`    FROM Month`, `Dropdown1.${i}.0`, work.from_month, 324.1);
    tx(`    FROM Year`, WORK_FROM_YEAR[i], work.from_year);
    ddReport(`    TO Month`, `Dropdown1.${i}.1`, work.to_month, 385.0);
    tx(`    TO Year`, WORK_TO_YEAR[i], work.to_year);
    tx(`    Reason`, WORK_REASON[i], work.reason);
  });
  radioReport(
    `PS Re-appointment`,
    `Group17`,
    psReapp(data.section_f_ps_reappointment),
    data.section_f_ps_reappointment === null ? "[not answered]" : data.section_f_ps_reappointment ? "Yes" : "No"
  );
  lines.push(`    NOTE: Group17 widget order reversed — Choice1=Yes, Choice2=No`);
  tx(
    `  PS Details`,
    `If yes Provide the name of the previous employing department and indicate the nature of the condition`,
    decl.ps_reappointment_details
  );
  lines.push(``);

  // ── Section G — References ─────────────────────────────────────────────────
  lines.push(`=== SECTION G — References ===`);
  data.section_g.slice(0, 3).forEach((ref, i) => {
    lines.push(`  Ref ${i + 1}:`);
    tx(`    Name`, REF_NAME[i], ref.name);
    tx(`    Relationship`, REF_REL[i], ref.relationship);
    tx(`    Tel`, REF_TEL[i], ref.tel);
  });
  lines.push(``);

  // ── Declaration date ───────────────────────────────────────────────────────
  lines.push(`=== DECLARATION DATE ===`);
  tx(`Date`, `Date`, data.declaration_date);

  lines.push(``);
  lines.push(`=== END OF AUDIT ===`);
  lines.push(`All ✓ = value set and read back correctly. Any ✗ = mapping error to fix.`);

  return lines.join("\n");
}

// ─── Sample data (dev use only) ──────────────────────────────────────────────
// Used by GET /api/tools/z83/sample to generate a reviewable filled PDF.
// Covers every field type: text, radio (Yes/No + multi-option), dropdown.
// business_with_state=true tests the "Yes" branch and free-text detail fields.

export const SAMPLE_Z83: Z83FillData = {
  section_a: {
    position: "Deputy Director: Human Resources Development",
    department: "Department of Public Service and Administration",
    ref_no: "DPSA 01/2026/01",
    availability: "1 calendar month notice period",
  },
  section_b: {
    name: "DLAMINI Thabo Sipho",
    passport_number: "",
    race: "African",
    gender: "Male",
    disability: false,
    sa_citizen: true,
    work_permit: false,
    preferred_language: "English",
    communication_pref: "Email",
    contact_details: "thabo.dlamini@webmail.co.za",
    nationality: "South African",
    years_private_sector: "3",
    years_public_sector: "7",
    professional_reg_date: "2018",
    professional_reg_number: "SABPP 45678",
  },
  section_d: [
    { language: "Zulu", read: "Good", write: "Good", speak: "Good", understand: "Good" },
    { language: "English", read: "Good", write: "Good", speak: "Good", understand: "Good" },
    { language: "Sotho", read: "Fair", write: "Fair", speak: "Good", understand: "Good" },
  ],
  section_e: [
    {
      institution: "University of Pretoria",
      qualification: "Bachelor of Arts in Human Resources Management",
      year: "2012",
    },
    {
      institution: "University of South Africa (UNISA)",
      qualification: "Postgraduate Diploma in Public Administration",
      year: "2016",
    },
  ],
  section_e_current: "",
  section_f: [
    {
      employer: "Department of Health — Gauteng Province",
      post: "Assistant Director: HR Management",
      from_month: "4",
      from_year: "2018",
      to_month: "",
      to_year: "",
      reason: "Currently employed",
    },
    {
      employer: "City of Tshwane Metropolitan Municipality",
      post: "Human Resources Officer",
      from_month: "1",
      from_year: "2013",
      to_month: "3",
      to_year: "2018",
      reason: "Career advancement",
    },
  ],
  section_f_ps_reappointment: false,
  section_g: [
    {
      name: "Dr. Nomvula Mthembu",
      relationship: "Line Manager",
      tel: "012 345 6789",
    },
    {
      name: "Mr. Sipho Khumalo",
      relationship: "Former Supervisor",
      tel: "011 234 5678",
    },
    {
      name: "Ms. Patricia van der Walt",
      relationship: "Senior Colleague",
      tel: "082 345 6789",
    },
  ],
  // --- Not stored in DB (display-only fields) ---
  id_number: "9003155678083",
  dob: "150390",
  section_b_declarations: {
    criminal_conviction: false,
    criminal_conviction_details: "",
    pending_criminal: false,
    pending_criminal_details: "",
    dismissed_misconduct: false,
    dismissed_misconduct_details: "",
    pending_disciplinary: false,
    pending_disciplinary_details: "",
    resigned_pending: false,
    resigned_pending_details: "",
    discharged_ill_health: false,
    // business_with_state=true tests the "Yes" radio branch + free-text field
    business_with_state: true,
    business_with_state_details:
      "Co-owner (silent partner) of ThS Consulting CC — IT staffing, registered CIPC 2015",
    will_relinquish: true,
    ps_reappointment_details: "",
  },
  page1_initials: null,
  page2_initials: null,
  signature: null,
  declaration_date: "13 September 2026",
};
