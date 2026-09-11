/**
 * Smoke-test for the DPSA parser against the locally downloaded circular.
 * Run: node scripts/test-dpsa-parse.mjs
 *
 * Downloads Circular 33 of 2026 (or reads a cached copy) and prints a
 * structured summary of the first 5 parsed posts + coverage stats.
 */

import { createRequire } from "module";
import { pathToFileURL } from "url";
import { readFileSync, existsSync } from "fs";
import https from "https";

// ---- PDF extraction (mirrors lib/dpsa-pdf.ts logic) ----

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  pathToFileURL(process.cwd() + "/x"),
).href;

const CONTENT_X_MIN = 190;
const LINE_Y_TOLERANCE = 3;
const LABEL_RE =
  /^(POST\s+\d+\/\d+|SALARY|CENTRE|REQUIREMENTS?|DUTIES|ENQUI[EI]?R[EI]ES?|APPLICATIONS?|CLOSING\s+DATE|NOTE|FOR\s+ATTENTION|STIPEND)$/i;

async function extractLines(buf) {
  const pdf = await pdfjs
    .getDocument({ data: new Uint8Array(buf.buffer), isEvalSupported: false, useSystemFonts: true, verbosity: 0 })
    .promise;
  const allLines = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent({ includeMarkedContent: false });
    const rawItems = content.items
      .filter((i) => i.str && i.str.trim())
      .map((i) => ({ str: i.str.trim(), x: Math.round(i.transform[4]), topY: Math.round(viewport.height - i.transform[5]) }))
      .sort((a, b) => a.topY - b.topY || a.x - b.x);
    const rows = [];
    for (const item of rawItems) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(item.topY - last[0].topY) <= LINE_Y_TOLERANCE) last.push(item);
      else rows.push([item]);
    }
    for (const row of rows) {
      const lp = [],
        cp = [];
      for (const item of row) {
        if (item.str === ":") continue;
        if (item.x < CONTENT_X_MIN && LABEL_RE.test(item.str)) lp.push(item.str);
        else if (item.x >= CONTENT_X_MIN) cp.push(item.str);
      }
      const label = lp.join(" ").trim();
      const content = cp.join(" ").trim();
      if (!label && !content) continue;
      if (!label && /^\d{1,3}$/.test(content)) continue;
      allLines.push({ label, content, page: pageNum });
    }
  }
  return allLines;
}

// ---- Parser (mirrors lib/dpsa-parser.ts logic) ----

const SA_PROVINCES = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo",
  "Mpumalanga","Northern Cape","North West","Western Cape",
];
const CITY_TO_PROV = {
  Pretoria: "Gauteng", Johannesburg: "Gauteng", "Cape Town": "Western Cape",
  Stellenbosch: "Western Cape", Durban: "KwaZulu-Natal",
  Pietermaritzburg: "KwaZulu-Natal", Bloemfontein: "Free State",
  Polokwane: "Limpopo", Mbombela: "Mpumalanga", Nelspruit: "Mpumalanga",
  Kimberley: "Northern Cape", Mahikeng: "North West", Rustenburg: "North West",
};

const nw = (s) => s.replace(/\s+/g, " ").trim();

function parseSalary(raw) {
  const amounts = Array.from(raw.matchAll(/R\s*([\d\s]+)/g))
    .map((m) => parseInt(m[1].replace(/\s+/g, ""), 10))
    .filter((n) => !isNaN(n) && n > 10000 && n < 20000000);
  const lm = raw.match(/Level\s+(\d+)/i);
  const level = lm ? parseInt(lm[1]) : null;
  if (!amounts.length) return { min: null, max: null, level };
  if (amounts.length === 1) return { min: amounts[0], max: amounts[0], level };
  return { min: Math.min(...amounts), max: Math.max(...amounts), level };
}
function parseCentre(raw) {
  const fl = raw.split("\n")[0].trim();
  const ci = fl.indexOf(":");
  if (ci > 0) {
    const left = fl.slice(0, ci).trim();
    const right = fl.slice(ci + 1).trim().split(",")[0].trim();
    const p = SA_PROVINCES.find((x) => x.toLowerCase() === left.toLowerCase());
    if (p) return { province: p, city: right || null };
  }
  for (const p of SA_PROVINCES) if (raw.toUpperCase().includes(p.toUpperCase())) return { province: p, city: null };
  for (const [city, province] of Object.entries(CITY_TO_PROV))
    if (new RegExp("\\b" + city + "\\b", "i").test(raw)) return { province, city };
  return { province: null, city: fl.split(/[,(]/)[0].trim() || null };
}
function parseDate(raw) {
  const M = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12 };
  const m = raw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!m) return null;
  const month = M[m[2].toLowerCase()];
  if (!month) return null;
  const tm = raw.match(/(\d{2}):(\d{2})/);
  return `${m[3]}-${String(month).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}T${tm?tm[1]:"16"}:${tm?tm[2]:"00"}:00+02:00`;
}
function extractRef(titleRaw) {
  const match = titleRaw.match(/\bREF\s*(?:NO)?[.:]\s*([A-Z0-9\/\-_]+(?:\s+[A-Z0-9\/\-_]+){0,2})/i);
  if (match) {
    // The 'i' flag makes [A-Z0-9] match lowercase, so mixed-case words like
    // "Directorate" can bleed into the capture. Strip from first such word.
    const ref_no = nw(match[1]).replace(/\s+[A-Z][a-z].*$/, "").trim();
    return {
      ref_no,
      title: nw(titleRaw.slice(0, titleRaw.toLowerCase().indexOf("ref")).replace(/[:\s]+$/, "")),
    };
  }
  return { title: nw(titleRaw), ref_no: "" };
}

function parseAll(lines, circRef) {
  let phase = "PREAMBLE", dept = "", sApps = "", sClose = "", sNote = "";
  let post = null, activeField = null;
  const posts = [];

  function flush() {
    if (!post || !post.post_number || !post.title_raw) { post = null; return; }
    const { title, ref_no } = extractRef(post.title_raw);
    const salary_raw = nw(post.salary_raw || "");
    const { min, max, level } = parseSalary(salary_raw);
    const centre_raw = nw(post.centre_raw || "");
    const { province, city } = parseCentre(centre_raw);
    const closing_date_raw = nw(post.closing_date_raw || sClose);
    const apply_address = nw(post.apply_address || sApps);
    posts.push({
      post_number: post.post_number, ref_no,
      title: title || nw(post.title_raw), department: dept,
      salary_raw, salary_min: min, salary_max: max, salary_level: level,
      centre_raw, province, city,
      requirements: nw(post.requirements || ""), duties: nw(post.duties || ""),
      contract_type: /fixed.term|contract\s+till/i.test((post.title_raw||"")+(salary_raw)+(sNote)) ? "contract"
        : /intern|learner/i.test(post.title_raw||"") ? "internship" : "permanent",
      closing_date_raw, expires_at: parseDate(closing_date_raw),
      apply_address, enquiries: nw(post.enquiries || ""),
      circular_ref: circRef,
    });
    post = null; activeField = null;
  }

  function app(text) {
    if (!activeField || !text) return;
    const s = " ";
    if (activeField === "title" && post) post.title_raw = (post.title_raw||"") + s + text;
    else if (activeField === "salary" && post) post.salary_raw = (post.salary_raw||"") + s + text;
    else if (activeField === "centre" && post) post.centre_raw = (post.centre_raw||"") + "\n" + text;
    else if (activeField === "requirements" && post) post.requirements = (post.requirements||"") + s + text;
    else if (activeField === "duties" && post) post.duties = (post.duties||"") + s + text;
    else if (activeField === "enquiries" && post) post.enquiries = (post.enquiries||"") + s + text;
    else if (activeField === "section_applications") { sApps += s + text; if (post) post.apply_address = sApps.trim(); }
    else if (activeField === "section_closing_date") { sClose += s + text; if (post) post.closing_date_raw = sClose.trim(); }
    else if (activeField === "section_note") sNote += s + text;
  }

  for (const line of lines) {
    const label = line.label.trim();
    const content = nw(line.content);
    const isAnnex = /^ANNEXURE\s+[A-T]$/i.test(label) || /^ANNEXURE\s+[A-T](\b|$)/i.test(content);
    if (isAnnex) { flush(); sApps=""; sClose=""; sNote=""; dept=""; phase="DEPT_HEADER"; activeField=null; continue; }
    if (phase==="DEPT_HEADER" && !label && content) {
      // Accept any mostly-uppercase line as department name (≥75% uppercase alpha chars).
      // Government dept names are in ALL CAPS; boilerplate is mixed case.
      const letters = content.replace(/[^A-Za-z]/g, "");
      const upperRatio = letters.length > 0
        ? letters.split("").filter(c => c === c.toUpperCase()).length / letters.length : 0;
      const looksLikeDept = letters.length >= 5 && content.length <= 160 && upperRatio >= 0.75 &&
        !/^(APPLICATIONS?\s+MUST|CLOSING\s+DATE|NOTE\s*:|EQUAL\s+OPPORTUNITY|AFFIRMATIVE\s+ACTION|ALL\s+RACE\s+GROUPS|CANDIDATES?\s+WHO)/i.test(content);
      if (looksLikeDept) { dept=content; phase="IN_SECTION"; activeField=null; }
      continue;
    }
    if (/^POST\s+\d+\/\d+$/i.test(label)) { flush(); post={post_number:label.replace(/^POST\s+/i,"").trim(),title_raw:content,closing_date_raw:sClose,apply_address:sApps}; activeField="title"; phase="IN_POST"; continue; }
    if (/^SALARY$/i.test(label)) { if(post){post.salary_raw=content;activeField="salary";} continue; }
    if (/^CENTRE$/i.test(label)) { if(post){post.centre_raw=content;activeField="centre";} continue; }
    if (/^REQUIREMENTS?$/i.test(label)) { if(post){post.requirements=content;activeField="requirements";} continue; }
    if (/^DUTIES$/i.test(label)) { if(post){post.duties=content;activeField="duties";} continue; }
    if (/^ENQUI[EI]?R[EI]ES?$/i.test(label)) { if(post){post.enquiries=content;activeField="enquiries";} continue; }
    if (/^APPLICATIONS?$/i.test(label)) { sApps=content; activeField="section_applications"; if(post)post.apply_address=content; continue; }
    if (/^CLOSING\s+DATE$/i.test(label)) { sClose=content; activeField="section_closing_date"; if(post)post.closing_date_raw=content; continue; }
    if (/^NOTE$/i.test(label)) { sNote=content; activeField="section_note"; continue; }
    if (/^FOR\s+ATTENTION$/i.test(label)) { if(content){sApps+=" For attention: "+content; if(post)post.apply_address=sApps.trim();} continue; }
    if (/^STIPEND$/i.test(label)) { if(post){post.salary_raw=content;activeField="salary";} continue; }
    if (!label && content) app(content);
  }
  flush();
  return posts;
}

// ---- Main ----

const CIRCULAR_URL = "https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/PSV%20CIRCULAR%2033%20of%202026.pdf";
const CACHE = "dpsa_test.pdf";
const buf = existsSync(CACHE) ? readFileSync(CACHE) : (() => { throw new Error("Run: curl -L -o dpsa_test.pdf '"+CIRCULAR_URL+"'"); })();

console.log("Extracting text from PDF...");
const lines = await extractLines(buf);
console.log("Extracted", lines.length, "structured lines.");

console.log("Parsing posts...");
const posts = parseAll(lines, "33 of 2026");
console.log("Total posts parsed:", posts.length, "\n");

console.log("=== FIRST 5 POSTS ===\n");
for (const p of posts.slice(0, 5)) {
  console.log("POST " + p.post_number + " | " + p.title);
  console.log("  ref_no:     " + p.ref_no);
  console.log("  dept:       " + p.department.slice(0, 65));
  console.log("  salary:     " + p.salary_raw.slice(0, 70));
  console.log("  salary_min: R" + p.salary_min + "  level: " + p.salary_level);
  console.log("  centre:     " + p.centre_raw.slice(0, 60));
  console.log("  province:   " + p.province + "  city: " + p.city);
  console.log("  contract:   " + p.contract_type);
  console.log("  closing:    " + p.closing_date_raw.slice(0, 40));
  console.log("  expires_at: " + p.expires_at);
  console.log("  apply:      " + p.apply_address.slice(0, 100));
  console.log("  enquiries:  " + p.enquiries.slice(0, 80));
  console.log("  req chars:  " + p.requirements.length);
  console.log("  dut chars:  " + p.duties.length);
  console.log();
}

const missing_ref = posts.filter((p) => !p.ref_no);
const missing_dept = posts.filter((p) => !p.department);
const missing_salary = posts.filter((p) => !p.salary_raw);
const missing_close = posts.filter((p) => !p.expires_at);
const missing_apply = posts.filter((p) => !p.apply_address);
console.log("=== COVERAGE STATS ===");
console.log("Total posts:       " + posts.length);
console.log("Missing ref_no:    " + missing_ref.length + (missing_ref.length ? " → " + missing_ref.slice(0,3).map(p=>p.post_number+":"+p.title.slice(0,30)).join(", ") : ""));
console.log("Missing dept:      " + missing_dept.length);
console.log("Missing salary:    " + missing_salary.length);
console.log("Missing expires:   " + missing_close.length + (missing_close.length ? " → " + missing_close.slice(0,3).map(p=>p.post_number).join(", ") : ""));
console.log("Missing apply_addr:" + missing_apply.length + (missing_apply.length ? " → " + missing_apply.slice(0,3).map(p=>p.post_number).join(", ") : ""));

const provPost = posts.find((p) => p.department.includes("KWAZULU") || p.department.includes("WESTERN CAPE") || p.department.includes("GAUTENG"));
if (provPost) {
  console.log("\n=== PROVINCIAL SAMPLE ===");
  console.log("POST " + provPost.post_number + " | " + provPost.title);
  console.log("  dept:     " + provPost.department.slice(0, 70));
  console.log("  province: " + provPost.province + "  city: " + provPost.city);
  console.log("  closing:  " + provPost.closing_date_raw);
  console.log("  apply:    " + provPost.apply_address.slice(0, 100));
}
