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
            "radial-gradient(circle at 30% 25%, #3B3B38 0%, #262624 52%, #161615 100%)",
          borderRadius: "9999px",
          border: "3px solid #D6D2C9",
          color: "#ECE9E1",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "-2px",
            marginBottom: "-2px",
          }}
        >
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "9999px",
              background: "#B8B4AA",
            }}
          />
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "9999px",
              background: "#ECE9E1",
            }}
          />
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "9999px",
              background: "#B8B4AA",
            }}
          />
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            display: "flex",
            color: "#ECE9E1",
          }}
        >
          U
        </div>

        <div
          style={{
            marginTop: "1px",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#C9C4B8",
            display: "flex",
          }}
        >
          {"<•>"}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
