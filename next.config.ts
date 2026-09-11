import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist uses Node.js-specific APIs (worker threads, file system).
  // Listing it here prevents webpack from attempting to bundle it — it will
  // be resolved by Node.js at runtime instead.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
