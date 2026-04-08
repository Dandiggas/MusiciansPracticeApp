import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config) => {
    // Prevent webpack from trying to bundle the PDF.js worker file.
    // We load it from CDN instead to keep the build lightweight.
    config.resolve.alias["pdfjs-dist/build/pdf.worker.min.mjs"] = false;
    return config;
  },
};

export default nextConfig;
