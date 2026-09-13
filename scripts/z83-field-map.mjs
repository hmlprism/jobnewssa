/**
 * Z83 AcroForm field inventory script.
 *
 * Usage: node scripts/z83-field-map.mjs
 *
 * Enumerates every field in the official Z83 PDF template, including:
 *   - Field name (exact internal AcroForm key used by pdf-lib)
 *   - Field type (PDFTextField / PDFRadioGroup / PDFDropdown / PDFCheckBox)
 *   - For radio groups and dropdowns: every valid option value
 *   - For text fields: whether multi-line, max length
 *
 * This is the authoritative reference for lib/z83-fill.ts.
 * Re-run if the template PDF is ever replaced.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  PDFDocument,
  PDFTextField,
  PDFRadioGroup,
  PDFDropdown,
  PDFCheckBox,
  PDFOptionList,
} from "pdf-lib";

const __dir = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dir, "..", "public", "forms", "z83-template.pdf");

const pdfBytes = readFileSync(templatePath);
const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
const form = pdfDoc.getForm();
const fields = form.getFields();

console.log(`\n===== Z83 AcroForm Field Map =====`);
console.log(`Template: public/forms/z83-template.pdf`);
console.log(`Total fields: ${fields.length}`);
console.log("==================================\n");

let idx = 0;
for (const field of fields) {
  idx++;
  const name = field.getName();
  const typeName = field.constructor.name;

  if (field instanceof PDFTextField) {
    const isMulti = field.isMultiline();
    const maxLen = field.getMaxLength();
    console.log(
      `[${idx}] TEXT      "${name}"` +
        (isMulti ? " [multiline]" : "") +
        (maxLen !== undefined ? ` [maxLen=${maxLen}]` : "")
    );
  } else if (field instanceof PDFRadioGroup) {
    const options = field.getOptions();
    console.log(`[${idx}] RADIO     "${name}" → options: [${options.map((o) => `"${o}"`).join(", ")}]`);
  } else if (field instanceof PDFDropdown) {
    const options = field.getOptions();
    console.log(`[${idx}] DROPDOWN  "${name}" → options: [${options.map((o) => `"${o}"`).join(", ")}]`);
  } else if (field instanceof PDFCheckBox) {
    console.log(`[${idx}] CHECKBOX  "${name}"`);
  } else if (field instanceof PDFOptionList) {
    const options = field.getOptions();
    console.log(`[${idx}] OPTLIST   "${name}" → options: [${options.map((o) => `"${o}"`).join(", ")}]`);
  } else {
    console.log(`[${idx}] UNKNOWN   "${name}" (type: ${typeName})`);
  }
}

console.log("\n===== Done =====\n");
