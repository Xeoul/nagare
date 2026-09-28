import type { MetadataRoute } from "next";
import { basePath } from "@/lib/base-path";

// Rendered once at build time - required for the static export (next.config.ts).
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nagare",
    short_name: "Nagare",
    description: "A Japanese reader that teaches as you read.",
    start_url: `${basePath}/`,
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [{ src: `${basePath}/icon`, sizes: "512x512", type: "image/png" }],
  };
}
