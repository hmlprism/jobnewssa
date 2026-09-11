/**
 * DPSA circular PDF text extraction.
 *
 * The circular uses a strict two-column layout on A4 (595pt wide):
 *   x ≤ ~150  — field labels (SALARY, CENTRE, POST XX/NNN, etc.)
 *   x  ≈ 185  — colon separator (filtered out)
 *   x ≥  214  — field values / content
 *
 * We use pdfjs-dist to extract text items with x,y coordinates per page,
 * group items into visual rows by y-proximity, then classify each item as
 * a label or content based on its column position.  This is equivalent to
 * `pdftotext -table` output but works inside Vercel's Node.js runtime.
 *
 * pdfjs-dist must be listed in next.config.ts serverExternalPackages so
 * it is NOT bundled by webpack — it uses native Node.js module resolution.
 */

/** x-coordinate threshold: labels are to the left, content to the right */
const CONTENT_X_MIN = 190;

/** y-coordinate tolerance for grouping text items into the same visual line */
const LINE_Y_TOLERANCE = 3;

/**
 * Known DPSA field label strings (exact match, case-insensitive).
 * Used to distinguish left-column labels from any other left-margin text.
 */
const LABEL_RE =
  /^(POST\s+\d+\/\d+|SALARY|CENTRE|REQUIREMENTS?|DUTIES|ENQUI[EI]?R[EI]ES?|APPLICATIONS?|CLOSING\s+DATE|NOTE|FOR\s+ATTENTION|STIPEND)$/i;

export interface TextLine {
  /** Field label from the left column — e.g. "SALARY", "POST 33/01". Empty for continuation lines. */
  label: string;
  /** All text from the right column (x ≥ 190), words joined with a single space. */
  content: string;
  page: number;
}

/**
 * Extracts structured text lines from a DPSA circular PDF buffer.
 * Maintains left/right column separation.
 */
export async function extractDpsaLines(data: ArrayBuffer): Promise<TextLine[]> {
  // Dynamic import keeps pdfjs out of the client bundle.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);

  // Use an absolute URL to the bundled worker so pdfjs can spawn it.
  // pathToFileURL produces a valid file:// URL on both Unix and Windows.
  const { pathToFileURL } = await import("url");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    pathToFileURL(process.cwd() + "/x"),
  ).href;

  const pdf = await pdfjs
    .getDocument({
      data: new Uint8Array(data),
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0,
    })
    .promise;

  const allLines: TextLine[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    const content = await page.getTextContent({ includeMarkedContent: false });

    // Build a list of {str, x, topY} — topY is distance from top of page.
    type RawItem = { str: string; x: number; topY: number };
    const rawItems: RawItem[] = [];

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const s = item.str.trim();
      if (!s) continue;
      rawItems.push({
        str: s,
        x: Math.round(item.transform[4]),
        topY: Math.round(pageHeight - item.transform[5]),
      });
    }

    // Sort top-to-bottom, then left-to-right within each row.
    rawItems.sort((a, b) => a.topY - b.topY || a.x - b.x);

    // Group into visual rows by topY proximity.
    const rows: RawItem[][] = [];
    for (const item of rawItems) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(item.topY - last[0].topY) <= LINE_Y_TOLERANCE) {
        last.push(item);
      } else {
        rows.push([item]);
      }
    }

    for (const row of rows) {
      const labelParts: string[] = [];
      const contentParts: string[] = [];

      for (const item of row) {
        if (item.str === ":") continue; // separator colon at x≈185

        if (item.x < CONTENT_X_MIN && LABEL_RE.test(item.str)) {
          // Left-column item that exactly matches a known field label.
          labelParts.push(item.str);
        } else if (item.x >= CONTENT_X_MIN) {
          // Right-column content.
          contentParts.push(item.str);
        }
        // Left-column items that are NOT field labels are ignored
        // (boilerplate intro text whose paragraphs start at the left margin).
      }

      const label = labelParts.join(" ").trim();
      const content = contentParts.join(" ").trim();

      if (!label && !content) continue;
      // Filter out isolated page numbers (e.g. "4", "217").
      if (!label && /^\d{1,3}$/.test(content)) continue;

      allLines.push({ label, content, page: pageNum });
    }
  }

  return allLines;
}

/**
 * Downloads a DPSA circular PDF from the given URL and returns extracted lines.
 */
export async function fetchAndExtractCircular(url: string): Promise<TextLine[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; JobNewsSA/1.0; +https://jobnewssa.vercel.app)",
    },
    signal: AbortSignal.timeout(90_000), // large PDF, allow up to 90 s
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch circular PDF: HTTP ${res.status} — ${url}`);
  }
  const buffer = await res.arrayBuffer();
  return extractDpsaLines(buffer);
}

/**
 * Fetches the DPSA newsroom listing page to find the current circular number and year.
 * Returns a canonical PDF URL.
 *
 * Falls back to computing from ISO week number if the page is unreachable.
 */
export async function findCurrentCircularUrl(): Promise<{
  url: string;
  circularRef: string;
}> {
  const NEWSROOM = "https://www.dpsa.gov.za/newsroom/psvc/";

  try {
    const res = await fetch(NEWSROOM, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JobNewsSA/1.0; +https://jobnewssa.vercel.app)",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.ok) {
      const html = await res.text();

      // The newsroom page links individual circulars like:
      //   href="/newsroom/psvc/circular-33-of-2026/"
      const pageMatch = html.match(/\/newsroom\/psvc\/circular-(\d+)-of-(\d{4})\//);
      if (pageMatch) {
        const n = parseInt(pageMatch[1], 10);
        const y = parseInt(pageMatch[2], 10);
        return circularUrlFromNumber(n, y);
      }

      // Also try direct PDF links embedded in the page
      const pdfMatch = html.match(
        /documents\/vacancies\/(\d{4})\/PSV[%20 ]+CIRCULAR[%20 ]+(\d+)[%20 ]+of[%20 ]+\d{4}\.pdf/i,
      );
      if (pdfMatch) {
        const y = parseInt(pdfMatch[1], 10);
        const n = parseInt(pdfMatch[2], 10);
        return circularUrlFromNumber(n, y);
      }
    }
  } catch {
    // Fall through to week-number estimate
  }

  // Fallback: estimate circular number from current week.
  // Circulars are published weekly (roughly weeks 2–51, skipping December).
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  // Circular numbers roughly match week numbers (±1 due to public holidays).
  const n = Math.max(1, weekNum - 1);
  return circularUrlFromNumber(n, year);
}

function circularUrlFromNumber(n: number, year: number) {
  const circularRef = `${n} of ${year}`;
  const encoded = `PSV%20CIRCULAR%20${n}%20of%20${year}.pdf`;
  const url = `https://www.dpsa.gov.za/dpsa2g/documents/vacancies/${year}/${encoded}`;
  return { url, circularRef };
}
