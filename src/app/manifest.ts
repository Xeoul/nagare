import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nagare",
    short_name: "Nagare",
    description: "A Japanese reader that teaches as you read.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
