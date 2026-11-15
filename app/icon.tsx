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
          background: "linear-gradient(135deg, #2b2118 0%, #68271e 55%, #c86d3b 100%)",
          borderRadius: "16px",
          border: "3px solid #f3ca82",
          color: "#fbf6ec",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#f3ca82",
            lineHeight: 1,
          }}
        >
          XII
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#fbf6ec",
            lineHeight: 1.05,
            marginTop: 1,
          }}
        >
          PPLG
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#e6d3b3",
            marginTop: 2,
          }}
        >
          MAKN 1
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
