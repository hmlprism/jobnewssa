// Generate a filled, flattened Z83 PDF from the wizard's complete form data.
// No auth required — anonymous users can download too.
// Sensitive fields (id_number, dob, declarations, signatures) are passed in
// the request body; they flow directly into fillZ83() and are never persisted.
import { type NextRequest, NextResponse } from "next/server";
import { fillZ83 } from "@/lib/z83-fill";
import type { Z83FillData } from "@/types/z83";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let data: Z83FillData;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!data?.section_a || !data?.section_b) {
    return NextResponse.json({ error: "Missing required sections" }, { status: 422 });
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await fillZ83(data);
  } catch (err) {
    console.error("[z83/generate] fillZ83 error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }

  const safeName = (data.section_b.name ?? "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40)
    || "Z83";

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-Z83.pdf"`,
    },
  });
}
