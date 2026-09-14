"use client";
// Global error boundary — catches errors thrown inside the root layout itself
// (app/layout.tsx). Because it replaces the entire page tree, it must supply
// its own <html> and <body> tags. CSS variables and font-face declarations from
// globals.css are unavailable here, so colors and fonts are hardcoded inline.
// This page is a last resort; it will almost never be shown in practice.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f7f5f0",
          color: "#12211a",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "5rem 1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#6b6558",
              margin: 0,
            }}
          >
            500
          </p>
          <h1
            style={{
              marginTop: "0.75rem",
              fontFamily: "Georgia, serif",
              fontSize: "1.875rem",
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              maxWidth: "24rem",
              fontSize: "0.875rem",
              color: "#6b6558",
            }}
          >
            An unexpected error occurred. Please reload the page.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "0.5rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
                color: "#6b6558",
              }}
            >
              Error ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "2rem",
              cursor: "pointer",
              border: "1px solid #12211a",
              background: "#12211a",
              color: "#f7f5f0",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#be421c";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#be421c";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#12211a";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#12211a";
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
