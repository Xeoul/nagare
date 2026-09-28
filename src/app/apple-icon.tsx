import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e5432a",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 112,
        }}
      >
        流
      </div>
    ),
    size,
  );
}
