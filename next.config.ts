import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// The commit this build is made from, shown in the library page's footer so
// it's easy to tell which version an installed copy is on. An explicit
// NEXT_PUBLIC_BUILD_ID wins; otherwise ask git, and fall back to "local" when
// there's no git checkout (for example a tarball).
function buildId(): string {
  if (process.env.NEXT_PUBLIC_BUILD_ID) return process.env.NEXT_PUBLIC_BUILD_ID;
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "local";
  }
}

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

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId() },
  ...(staticExport
    ? { output: "export" as const, trailingSlash: true, basePath }
    : {
        basePath,
        async headers() {
          return ["/dict/:path*", "/dictionary/:path*", "/classics/:path*", "/readers/:path*", "/aozora/:path*"].map(
            (source) => ({ source, headers: [{ key: "Cache-Control", value: STATIC_DATA_CACHE }] }),
          );
        },
      }),
};

export default nextConfig;
