import { ImageResponse } from "next/og";

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
          background: "#e5432a",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 320,
        }}
      >
        流
      </div>
    ),
    size,
  );
}
