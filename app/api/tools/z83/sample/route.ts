// Development-only route — verifies that fillZ83() fills every field type correctly.
// Not available in production.
//
// GET /api/tools/z83/sample          → downloads filled z83-sample.pdf
// GET /api/tools/z83/sample?summary=1 → plain-text field audit (set vs read-back)
import { type NextRequest, NextResponse } from "next/server";
import { fillZ83, auditZ83, SAMPLE_Z83 } from "@/lib/z83-fill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const wantSummary = req.nextUrl.searchParams.get("summary") === "1";

  if (wantSummary) {
    const report = await auditZ83(SAMPLE_Z83);
    return new Response(report, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'inline; filename="z83-audit.txt"',
      },
    });
  }

  const pdfBytes = await fillZ83(SAMPLE_Z83);
  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="z83-sample.pdf"',
    },
  });
}
