import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: almost every page here depends on who is logged in,
  // and the classic dynamic-rendering model is simpler for the whole team to work with.
  cacheComponents: false,
  experimental: {
    // The proxy (src/proxy.ts) buffers request bodies and cuts them at 10 MB by default,
    // which breaks uploads near the limit. Keep it in step with bodySizeLimit below.
    proxyClientMaxBodySize: "11mb",
    serverActions: {
      // Document uploads go through a server action and may be up to 10 MB (plus multipart overhead).
      bodySizeLimit: "11mb",
    },
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
