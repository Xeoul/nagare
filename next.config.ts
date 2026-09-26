import type { NextConfig } from "next";

// The tokenizer dictionary (~18MB) and word dictionary (~8MB) are static
// files without hashed names, so by default every visit re-validates them.
// Let browsers keep them for a day and refresh in the background after that.
const STATIC_DATA_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  async headers() {
    return ["/dict/:path*", "/dictionary/:path*", "/classics/:path*", "/readers/:path*"].map(
      (source) => ({ source, headers: [{ key: "Cache-Control", value: STATIC_DATA_CACHE }] }),
    );
  },
};

export default nextConfig;
