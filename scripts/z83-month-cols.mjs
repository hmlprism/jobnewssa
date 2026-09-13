/**
 * Diagnostic: prints X positions of all Dropdown1 (work-experience month) fields
 * so we can confirm which column index (.0 or .1) is FROM vs TO.
 *
 * Usage: node scripts/z83-month-cols.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";

const __dir = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dir, "..", "public", "forms", "z83-template.pdf");

const pdfDoc = await PDFDocument.load(readFileSync(templatePath), { ignoreEncryption: true });
const form = pdfDoc.getForm();

function rect(fieldName) {
  try {
    const widgets = form.getDropdown(fieldName).acroField.getWidgets();
    return widgets.map((w) => {
      const r = w.getRectangle();
      return { x: r.x, xCenter: r.x + r.width / 2, y: r.y, w: r.width, h: r.height };
    });
  } catch {
    return null;
  }
}

function txRect(fieldName) {
  try {
    const widgets = form.getTextField(fieldName).acroField.getWidgets();
    return widgets.map((w) => {
      const r = w.getRectangle();
      return { x: r.x, xCenter: r.x + r.width / 2, y: r.y, w: r.width };
    });
  } catch {
    return null;
  }
}

console.log("\n=== Dropdown1 (work-exp month) widget X positions ===");
console.log("Lower xCenter = left on page (FROM), higher = right (TO)\n");

const dd1Names = [
  "Dropdown1.0.0", "Dropdown1.0.1",
  "Dropdown1.1.0", "Dropdown1.1.1",
  "Dropdown1.2.0", "Dropdown1.2.1",
];
for (const name of dd1Names) {
  const rects = rect(name);
  if (!rects) { console.log(`  ${name}  NOT FOUND`); continue; }
  rects.forEach((r) =>
    console.log(`  ${name}  xCenter=${r.xCenter.toFixed(1)}  y=${r.y.toFixed(1)}`)
  );
}

console.log("\n=== YY (year) fields for comparison ===");
const yyNames = ["YYRow1", "YYRow1_2", "YYRow2", "YYRow2_2", "YYRow3", "YYRow3_2"];
for (const name of yyNames) {
  const rects = txRect(name);
  if (!rects) { console.log(`  ${name}  NOT FOUND`); continue; }
  rects.forEach((r) =>
    console.log(`  ${name}  xCenter=${r.xCenter.toFixed(1)}  y=${r.y.toFixed(1)}`)
  );
}

console.log("\n=== Summary: column assignments ===");
// Group by row and compare xCenter values
const rows = [0, 1, 2];
for (const i of rows) {
  const a = rect(`Dropdown1.${i}.0`)?.[0];
  const b = rect(`Dropdown1.${i}.1`)?.[0];
  if (!a || !b) { console.log(`  Row ${i+1}: missing field`); continue; }
  const fromName = a.xCenter < b.xCenter ? `Dropdown1.${i}.0` : `Dropdown1.${i}.1`;
  const toName   = a.xCenter < b.xCenter ? `Dropdown1.${i}.1` : `Dropdown1.${i}.0`;
  console.log(`  Row ${i+1}: FROM-month=${fromName} (xCenter=${Math.min(a.xCenter,b.xCenter).toFixed(1)})  TO-month=${toName} (xCenter=${Math.max(a.xCenter,b.xCenter).toFixed(1)})`);
}

console.log("");
