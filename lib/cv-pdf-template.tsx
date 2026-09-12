// CV PDF template — Broadsheet style.
// Rendered server-side only via @react-pdf/renderer in the API route.
// Do NOT import this in any client component.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";
import path from "path";
import fs from "fs";
import type { CvData } from "@/types/cv";

// ---------------------------------------------------------------------------
// Font registration.
// @react-pdf/font uses fetch() internally which doesn't support file:// URLs
// in the Next.js runtime. Read fonts with fs and pass as base64 data URIs —
// @react-pdf/font's isDataUrl() path handles these without any fetch call.
// ---------------------------------------------------------------------------

// Read font files eagerly at module load time (once per server instance).
// Using TTF variable fonts — WOFF2 triggers a pdfkit DataView bounds error
// during PDF embedding even though fontkit parses WOFF2 fine standalone.
function fontDataUri(filename: string, mimeType = "font/ttf"): string {
  const buf = fs.readFileSync(path.join(process.cwd(), "public", "fonts", filename));
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}

const interDataUri = fontDataUri("inter-variable.ttf");
const frauncesDataUri = fontDataUri("fraunces-variable.ttf");

// Register at each weight we use — fontkit instances the variable font
// at the requested weight when pdfkit embeds it.
Font.register({
  family: "Inter",
  fonts: [
    { src: interDataUri, fontWeight: 400 },
    { src: interDataUri, fontWeight: 500 },
    { src: interDataUri, fontWeight: 600 },
  ],
});

Font.register({
  family: "Fraunces",
  fonts: [{ src: frauncesDataUri, fontWeight: 600 }],
});

// Prevent line-break hyphenation — matches the no-hyphenation web convention
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Design tokens — mirrors globals.css
// ---------------------------------------------------------------------------
const INK = "#12211a";
const MUTED = "#6b6558";
const LINE = "#ddd8ca";
const PAPER = "#f7f5f0";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.5,
    color: INK,
    backgroundColor: PAPER,
    paddingTop: 44,
    paddingBottom: 44,
    paddingLeft: 48,
    paddingRight: 48,
    lineHeight: 1.45,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    borderBottomStyle: "solid",
  },
  headerLeft: {
    flex: 1,
  },
  candidateName: {
    fontFamily: "Fraunces",
    fontWeight: 600,
    fontSize: 26,
    color: INK,
    marginBottom: 4,
    lineHeight: 1.15,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginTop: 6,
  },
  contactItem: {
    fontSize: 8.5,
    color: MUTED,
    fontWeight: 400,
    marginRight: 14,
    marginBottom: 2,
  },
  contactLink: {
    fontSize: 8.5,
    color: MUTED,
    fontWeight: 400,
    marginRight: 14,
    textDecoration: "none",
  },
  idLine: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 4,
  },
  photo: {
    width: 62,
    height: 62,
    borderRadius: 0, // no border-radius per design system
    marginLeft: 20,
    objectFit: "cover",
  },

  // Section
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 7.5,
    fontWeight: 600,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: LINE,
    borderBottomStyle: "solid",
  },

  // Summary
  summaryText: {
    fontSize: 9.5,
    color: INK,
    fontWeight: 400,
    lineHeight: 1.55,
  },

  // Work experience
  workEntry: {
    marginBottom: 9,
  },
  workEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  workTitle: {
    fontSize: 9.5,
    fontWeight: 600,
    color: INK,
  },
  workDates: {
    fontSize: 8.5,
    color: MUTED,
    fontWeight: 400,
    flexShrink: 0,
    marginLeft: 10,
  },
  workEmployer: {
    fontSize: 8.5,
    color: MUTED,
    fontWeight: 400,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    fontSize: 8,
    color: MUTED,
    width: 10,
    marginTop: 0.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: INK,
    lineHeight: 1.45,
  },

  // Education
  educationEntry: {
    marginBottom: 7,
  },
  educationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eduQualification: {
    fontSize: 9.5,
    fontWeight: 600,
    color: INK,
  },
  eduYear: {
    fontSize: 8.5,
    color: MUTED,
    fontWeight: 400,
    flexShrink: 0,
    marginLeft: 10,
  },
  eduInstitution: {
    fontSize: 8.5,
    color: MUTED,
    fontWeight: 400,
    marginBottom: 1,
  },
  eduNqf: {
    fontSize: 8,
    color: MUTED,
    fontWeight: 400,
  },

  // Skills
  skillsBlock: {
    marginBottom: 5,
  },
  skillsLabel: {
    fontSize: 8.5,
    fontWeight: 600,
    color: INK,
    marginBottom: 2,
  },
  skillsList: {
    fontSize: 9,
    color: INK,
    fontWeight: 400,
    lineHeight: 1.45,
  },

  // References
  refsText: {
    fontSize: 9,
    color: MUTED,
  },
});

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SectionHeading({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title.toUpperCase()}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>–</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main template component
// ---------------------------------------------------------------------------

export function CvDocument({ cv }: { cv: CvData }) {
  const { contact, summary, work_experience, education, skills } = cv;

  const dateRange = (entry: { start: string; end: string | null; current: boolean }) =>
    entry.current ? `${entry.start} – Present` : `${entry.start} – ${entry.end ?? ""}`;

  return (
    <Document
      title={contact.name ? `CV – ${contact.name}` : "CV"}
      author={contact.name}
      creator="Job News SA CV Maker"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ───────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.candidateName}>{contact.name || "Your Name"}</Text>

            <View style={s.contactRow}>
              {contact.email ? (
                <Link src={`mailto:${contact.email}`} style={s.contactLink}>
                  {contact.email}
                </Link>
              ) : null}
              {contact.phone ? (
                <Text style={s.contactItem}>{contact.phone}</Text>
              ) : null}
              {contact.city && contact.province ? (
                <Text style={s.contactItem}>
                  {contact.city}, {contact.province}
                </Text>
              ) : contact.city ? (
                <Text style={s.contactItem}>{contact.city}</Text>
              ) : null}
              {contact.linkedin ? (
                <Link
                  src={
                    contact.linkedin.startsWith("http")
                      ? contact.linkedin
                      : `https://linkedin.com/in/${contact.linkedin}`
                  }
                  style={s.contactLink}
                >
                  {contact.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}
                </Link>
              ) : null}
            </View>

            {cv.id_number ? (
              <Text style={s.idLine}>ID: {cv.id_number}</Text>
            ) : null}
          </View>

          {cv.include_photo && cv.photo_url ? (
            <Image style={s.photo} src={cv.photo_url} />
          ) : null}
        </View>

        {/* ── Summary ──────────────────────────────────────────── */}
        {summary ? (
          <View style={s.section}>
            <SectionHeading title="Professional Summary" />
            <Text style={s.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* ── Work Experience ───────────────────────────────────── */}
        {work_experience.length > 0 ? (
          <View style={s.section}>
            <SectionHeading title="Work Experience" />
            {work_experience.map((entry, i) => (
              <View key={i} style={s.workEntry} wrap={false}>
                <View style={s.workEntryHeader}>
                  <Text style={s.workTitle}>{entry.title}</Text>
                  <Text style={s.workDates}>{dateRange(entry)}</Text>
                </View>
                <Text style={s.workEmployer}>{entry.employer}</Text>
                {entry.bullets.filter(Boolean).map((b, j) => (
                  <Bullet key={j} text={b} />
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Education ─────────────────────────────────────────── */}
        {education.length > 0 ? (
          <View style={s.section}>
            <SectionHeading title="Education" />
            {education.map((entry, i) => (
              <View key={i} style={s.educationEntry} wrap={false}>
                <View style={s.educationHeader}>
                  <Text style={s.eduQualification}>{entry.qualification}</Text>
                  <Text style={s.eduYear}>{entry.year}</Text>
                </View>
                <Text style={s.eduInstitution}>{entry.institution}</Text>
                {entry.nqf_level ? (
                  <Text style={s.eduNqf}>NQF Level {entry.nqf_level}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Skills ────────────────────────────────────────────── */}
        {(skills.technical.length > 0 || skills.soft.length > 0) ? (
          <View style={s.section}>
            <SectionHeading title="Skills" />
            {skills.technical.length > 0 ? (
              <View style={s.skillsBlock}>
                <Text style={s.skillsLabel}>Technical</Text>
                <Text style={s.skillsList}>{skills.technical.join("  ·  ")}</Text>
              </View>
            ) : null}
            {skills.soft.length > 0 ? (
              <View style={s.skillsBlock}>
                <Text style={s.skillsLabel}>Soft Skills</Text>
                <Text style={s.skillsList}>{skills.soft.join("  ·  ")}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── References ────────────────────────────────────────── */}
        {cv.references_on_request ? (
          <View style={s.section}>
            <SectionHeading title="References" />
            <Text style={s.refsText}>References available on request.</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Sample data — used by the test route in development only
// ---------------------------------------------------------------------------

export const SAMPLE_CV: CvData = {
  contact: {
    name: "Thandi Mokoena",
    email: "thandi.mokoena@email.co.za",
    phone: "071 234 5678",
    city: "Johannesburg",
    province: "Gauteng",
    linkedin: "thandi-mokoena",
  },
  summary:
    "Qualified CA(SA) with seven years of experience in financial reporting, statutory audits, and IFRS compliance across banking and retail sectors. Proven record of managing cross-functional teams and delivering accurate, timely results under pressure. Seeking a senior finance role in a growth-oriented organisation.",
  work_experience: [
    {
      employer: "First National Bank",
      title: "Senior Financial Analyst",
      start: "Mar 2021",
      end: null,
      current: true,
      bullets: [
        "Led monthly consolidation of R4.2bn balance sheet across six business units, reducing close cycle from 8 to 5 days.",
        "Developed an automated IFRS 9 provisioning model in Excel/VBA that cut manual calculation time by 60%.",
        "Managed two junior analysts and coordinated with external auditors (PwC) for the annual statutory audit.",
      ],
    },
    {
      employer: "Deloitte South Africa",
      title: "Audit Senior",
      start: "Jan 2018",
      end: "Feb 2021",
      current: false,
      bullets: [
        "Executed audit fieldwork on JSE-listed retail and financial services clients with combined revenue exceeding R20bn.",
        "Identified a R12m revenue recognition error during client engagement — resolved without restatement via correction of accruals.",
        "Supervised and reviewed work of three article clerks per engagement.",
      ],
    },
  ],
  education: [
    {
      institution: "University of the Witwatersrand",
      qualification: "Bachelor of Commerce (Accounting)",
      year: "2016",
      nqf_level: "7",
    },
    {
      institution: "SAICA — SA Institute of Chartered Accountants",
      qualification: "CA(SA) — Chartered Accountant",
      year: "2018",
      nqf_level: "8",
    },
  ],
  skills: {
    technical: ["IFRS / GAAP", "Excel / VBA", "SAP", "Caseware", "Power BI", "SARS e-Filing"],
    soft: ["Analytical thinking", "Team leadership", "Deadline management", "Clear written communication"],
  },
  references_on_request: true,
  template: "broadsheet",
  include_photo: false,
  id_number: "",
};
