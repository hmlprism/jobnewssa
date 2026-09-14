"use client";

import { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

// ─── Ink pad canvas ───────────────────────────────────────────────────────────
//
// Implementation notes:
//
// 1. Event listeners are attached imperatively (not via JSX) so we can pass
//    { passive: false } to touchstart and touchmove. React synthetic events
//    are always passive, which prevents e.preventDefault() from working and
//    causes the page to scroll while drawing.
//
// 2. touch-action: none (Tailwind: touch-none) tells the browser at the CSS
//    level not to handle touch gestures on this element — belt-and-suspenders
//    alongside e.preventDefault().
//
// 3. Scale correction: the canvas has fixed internal pixel dimensions
//    (canvasWidth × canvasHeight) but is displayed at w-full via CSS. The
//    ratio canvas.width / rect.width maps CSS screen coordinates to canvas
//    pixel coordinates so strokes land where the finger/cursor actually is.
//
// 4. onChange is stored in a ref so the single useEffect (which attaches
//    listeners) doesn't need to re-run on every render when the parent passes
//    an inline arrow function. exportCanvas (which calls onChangeRef.current)
//    is wrapped in useCallback with empty deps — stable across renders.

const INK = "#12211A"; // --color-ink

interface InkPadProps {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

function InkPad({
  label,
  hint,
  value,
  onChange,
  canvasWidth = 400,
  canvasHeight = 80,
}: InkPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Keep onChange reachable inside the stable event-listener closure
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // When value is reset to null externally, clear the canvas
  useEffect(() => {
    if (value !== null) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }, [value, canvasWidth, canvasHeight]);

  // Map a client-coordinate point to canvas pixel coordinates
  const toCanvasPos = (
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement
  ) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top) * (canvas.height / r.height),
    };
  };

  // Serialise the canvas to a PNG data URI and push it upward
  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChangeRef.current(canvas.toDataURL("image/png"));
  }, []);

  // Attach all listeners once — stable deps mean no repeated attach/detach
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const startAt = (clientX: number, clientY: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      isDrawing.current = true;
      const pos = toCanvasPos(clientX, clientY, canvas);
      lastPos.current = pos;
      // Draw a dot so a tap with no drag still leaves a mark
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 0.75, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    };

    const moveTo = (clientX: number, clientY: number) => {
      if (!isDrawing.current || !lastPos.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = toCanvasPos(clientX, clientY, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
    };

    const endStroke = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      lastPos.current = null;
      exportCanvas();
    };

    // Mouse
    const onMouseDown = (e: MouseEvent) => startAt(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => moveTo(e.clientX, e.clientY);
    const onMouseUp = () => endStroke();
    const onMouseLeave = () => endStroke(); // prevents stuck-drawing if cursor leaves

    // Touch — passive: false required so e.preventDefault() actually fires
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0)
        startAt(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0)
        moveTo(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => endStroke();

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [exportCanvas]);

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    onChangeRef.current(null);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
        {value !== null && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-rust)] transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="block w-full touch-none cursor-crosshair border border-[var(--color-line)] bg-white"
        style={{ height: `${canvasHeight}px` }}
      />
      {hint && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  page1Initials: string | null;
  page2Initials: string | null;
  signature: string | null;
  declarationDate: string;
  downloading: boolean;
  downloadError: string | null;
  onPage1InitialsChange: (v: string | null) => void;
  onPage2InitialsChange: (v: string | null) => void;
  onSignatureChange: (v: string | null) => void;
  onDeclarationDateChange: (v: string) => void;
  onDownload: () => void;
}

// ─── Step Preview ─────────────────────────────────────────────────────────────

const inputOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";

export function StepPreview({
  page1Initials,
  page2Initials,
  signature,
  declarationDate,
  downloading,
  downloadError,
  onPage1InitialsChange,
  onPage2InitialsChange,
  onSignatureChange,
  onDeclarationDateChange,
  onDownload,
}: Props) {
  return (
    <div className="space-y-8">
      {/* ── Explanation ───────────────────────────────────────────────── */}
      <div className="border-l-2 border-[var(--color-line)] px-4 py-3">
        <p className="text-sm text-[var(--color-ink)]">
          The Z83 requires your initials at the foot of each page and your full
          signature on the declaration section of page 2. Draw in the boxes
          below — they are printed directly onto the PDF.
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          All three are optional for the download; leave blank if you intend to
          sign the printed copy by hand.
        </p>
      </div>

      {/* ── Initials ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Initials
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <InkPad
            label="Page 1 initials"
            hint="Draw your initials — e.g. T.S.D"
            value={page1Initials}
            onChange={onPage1InitialsChange}
            canvasWidth={400}
            canvasHeight={80}
          />
          <InkPad
            label="Page 2 initials"
            hint="Draw your initials — e.g. T.S.D"
            value={page2Initials}
            onChange={onPage2InitialsChange}
            canvasWidth={400}
            canvasHeight={80}
          />
        </div>
      </section>

      {/* ── Signature ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Declaration signature
        </h2>
        <InkPad
          label="Signature"
          hint="Draw your full signature"
          value={signature}
          onChange={onSignatureChange}
          canvasWidth={600}
          canvasHeight={80}
        />
      </section>

      {/* ── Declaration date ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Declaration date
        </h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
            Date
          </label>
          <input
            type="text"
            className={inputOk}
            placeholder="14 September 2026"
            value={declarationDate}
            onChange={(e) => onDeclarationDateChange(e.target.value)}
            style={{ maxWidth: "16rem" }}
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Enter the date as it should appear on the form — e.g. 14 September 2026
          </p>
        </div>
      </section>

      {/* ── Download ─────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--color-line)] pt-6">
        <Button type="button" onClick={onDownload} disabled={downloading}>
          {downloading ? "Generating…" : "Download Z83 PDF"}
        </Button>
        {downloadError && (
          <p className="text-sm text-[var(--color-rust)]">{downloadError}</p>
        )}
      </div>
    </div>
  );
}
