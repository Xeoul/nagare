import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nagare",
    short_name: "Nagare",
    description: "A Japanese reader that teaches as you read.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef1ec",
    theme_color: "#2c4a6e",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
