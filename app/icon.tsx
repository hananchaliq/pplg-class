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
            "radial-gradient(circle at 30% 25%, #e88d3f 0%, #b84a27 52%, #58190e 100%)",
          borderRadius: "9999px",
          border: "3px solid #f4ca7e",
          color: "#fff9f0",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* 3 Titik Bintang Puncak (3 Tahun & 3 Danau Kelimutu) */}
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
              background: "#f7ce7e",
            }}
          />
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "9999px",
              background: "#ffebb8",
            }}
          />
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "9999px",
              background: "#f7ce7e",
            }}
          />
        </div>

        {/* Huruf Monogram U */}
        <div
          style={{
            fontSize: 34,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            display: "flex",
            color: "#fff9f0",
          }}
        >
          U
        </div>

        {/* Simbol Kode PPLG di Bawah Huruf U */}
        <div
          style={{
            marginTop: "1px",
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#ffe1a6",
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
