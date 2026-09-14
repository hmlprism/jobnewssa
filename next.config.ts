import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // pdfjs-dist uses Node.js-specific APIs (worker threads, file system).
  // Listing it here prevents webpack from attempting to bundle it — it will
  // be resolved by Node.js at runtime instead.
  // @react-pdf/renderer uses Node.js canvas APIs not compatible with webpack bundling
  serverExternalPackages: ["pdfjs-dist", "@react-pdf/renderer"],

  // Restrict all /api/* routes to requests originating from our own domain.
  // CORS is a browser enforcement mechanism — this has no effect on server-to-
  // server calls (Vercel cron, Supabase webhooks, etc.), which are already
  // protected by CRON_SECRET / service-role key checks in the route handlers.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://jobnewssa.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
