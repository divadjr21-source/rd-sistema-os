import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
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
          background: "#10b981",
          borderRadius: 7,
          color: "#0b0e11",
          fontSize: 15,
          fontWeight: 800,
          fontFamily: "Arial, sans-serif",
          letterSpacing: -1,
        }}
      >
        RD
      </div>
    ),
    { ...size }
  );
}
