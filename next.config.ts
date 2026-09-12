import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist uses Node.js-specific APIs (worker threads, file system).
  // Listing it here prevents webpack from attempting to bundle it — it will
  // be resolved by Node.js at runtime instead.
  // @react-pdf/renderer uses Node.js canvas APIs not compatible with webpack bundling
  serverExternalPackages: ["pdfjs-dist", "@react-pdf/renderer"],
};

export default nextConfig;
