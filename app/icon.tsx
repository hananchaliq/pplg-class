import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #d97736 0%, #b84a27 55%, #7c2817 100%)",
          borderRadius: "16px",
          border: "3px solid #f4ca7e",
          color: "#fff8ec",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: "0.04em",
            lineHeight: 1,
            display: "flex",
          }}
        >
          UNO
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#ffe1a6",
            display: "flex",
          }}
        >
          PPLG 1
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
