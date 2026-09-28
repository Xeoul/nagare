import type { NextConfig } from "next";

// The tokenizer dictionary (~18MB) and word dictionary (~8MB) are static
// files without hashed names, so by default every visit re-validates them.
// Let browsers keep them for a day and refresh in the background after that.
const STATIC_DATA_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

// NAGARE_STATIC_EXPORT=1 builds the app as plain static files (out/) for the
// GitHub Pages demo - see .github/workflows/pages.yml. Everything already
// runs client-side, so nothing is lost except the custom headers, which a
// static export can't set (GitHub Pages applies its own caching instead).
// NEXT_PUBLIC_BASE_PATH is the sub-path that demo is served under
// ("/nagare"); src/lib/base-path.ts reads the same variable for fetch() calls.
const staticExport = process.env.NAGARE_STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = staticExport
  ? { output: "export", trailingSlash: true, basePath }
  : {
      basePath,
      async headers() {
        return ["/dict/:path*", "/dictionary/:path*", "/classics/:path*", "/readers/:path*"].map(
          (source) => ({ source, headers: [{ key: "Cache-Control", value: STATIC_DATA_CACHE }] }),
        );
      },
    };

export default nextConfig;
