import { ImageResponse } from "next/og";

// Rendered once at build time - required for the static export (next.config.ts).
export const dynamic = "force-static";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141416",
          color: "#ecebe6",
          fontWeight: 600,
          fontSize: 320,
        }}
      >
        流
      </div>
    ),
    size,
  );
}
