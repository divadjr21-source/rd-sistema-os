import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
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
          background: "#10b981",
          color: "#0b0e11",
          fontSize: 88,
          fontWeight: 800,
          fontFamily: "Arial, sans-serif",
          letterSpacing: -4,
        }}
      >
        RD
      </div>
    ),
    { ...size }
  );
}
