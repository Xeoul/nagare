import type { Viewport } from "next";
import Feed from "@/components/feed/Feed";

// The feed is a full-bleed dark surface, so tint the browser/status bar to match.
export const viewport: Viewport = {
  themeColor: "#08080a",
};

export default function Home() {
  return <Feed />;
}
