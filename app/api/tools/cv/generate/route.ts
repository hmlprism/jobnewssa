import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { CvDocument } from "@/lib/cv-pdf-template";
import type { CvData } from "@/types/cv";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  cv: CvData;
  id_number?: string;
  photo_url?: string | null;
}

export async function POST(req: NextRequest) {
  // 10 PDF renders / IP / minute — compute-heavy, no auth required.
  const rl = await checkRateLimit(getClientIp(req), 10, "1 m");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before generating another CV." },
      {
        status: 429,
        headers: rl.retryAfter ? { "Retry-After": String(rl.retryAfter) } : {},
      }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { cv, id_number, photo_url } = body;

  if (!cv) {
    return NextResponse.json({ error: "Missing cv field" }, { status: 400 });
  }
  if (!cv.contact?.name?.trim() || !cv.contact?.email?.trim()) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 422 }
    );
  }

  // Merge display-only fields that the wizard sends separately (never in the DB)
  const cvWithExtras: CvData = {
    ...cv,
    id_number: id_number ?? "",
    // photo_url is attached here for the template; it is NOT stored in cv_drafts.data
    photo_url: cv.include_photo ? (photo_url ?? null) : null,
  };

  // Fetch photo as base64 data URI if provided — @react-pdf/renderer's Image
  // component needs a data URI in the Node.js runtime (HTTPS URLs should work
  // but are subject to cold-start network latency; data URI is guaranteed).
  if (cvWithExtras.photo_url) {
    try {
      const resp = await fetch(cvWithExtras.photo_url);
      if (resp.ok) {
        const contentType = resp.headers.get("content-type") ?? "image/jpeg";
        const buf = await resp.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        cvWithExtras.photo_url = `data:${contentType};base64,${b64}`;
      } else {
        // If the fetch fails, fall back gracefully to no photo rather than
        // failing the whole PDF render.
        cvWithExtras.photo_url = null;
        cvWithExtras.include_photo = false;
      }
    } catch {
      cvWithExtras.photo_url = null;
      cvWithExtras.include_photo = false;
    }
  }

  const el = React.createElement(
    CvDocument,
    { cv: cvWithExtras }
  ) as React.ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(el);

  const safeName = cv.contact.name.replace(/[^a-z0-9\s-]/gi, "").trim().replace(/\s+/g, "-") || "cv";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-CV.pdf"`,
      // No Cache-Control — this is a dynamic endpoint, never cached
    },
  });
}
