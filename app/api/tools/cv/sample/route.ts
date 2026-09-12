// Development-only test route — returns a PDF of the sample CV.
// Gated to non-production. Delete after Step 3 verification.
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { CvDocument, SAMPLE_CV } from "@/lib/cv-pdf-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  // Cast required: CvDocument wraps <Document> but TS sees our component props, not DocumentProps
  const el = React.createElement(CvDocument, { cv: SAMPLE_CV }) as React.ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(el);

  // Buffer extends Uint8Array; cast for BodyInit compatibility across TS environments
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="sample-cv.pdf"',
    },
  });
}
