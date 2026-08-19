import { ImageResponse } from "next/og"

export const alt = "UpClass learning management system preview"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

// Classroom Focus social preview: neutral canvas, UpClass blue, and clear type hierarchy.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "#f7f8fa",
          color: "#17202a",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "12px", // Card radius
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(0, 0, 0, 0.08)", // Ink hairline
              background: "#0075de", // Notion Blue
            }}
          >
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path
                d="M10 22L22 10M22 10H14M22 10V18"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: "34px", fontWeight: 600 }}>UpClass</div>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "860px" }}>
          <div
            style={{
              fontSize: "20px",
              textTransform: "uppercase",
              color: "#0075de",
              fontWeight: 600,
            }}
          >
            Focused teaching, not software overhead
          </div>
          <div
            style={{
              fontSize: "68px",
              lineHeight: 1.08,
              fontWeight: 600,
            }}
          >
            A learning management system built for realtime classrooms
          </div>
          <div
            style={{
              fontSize: "26px",
              lineHeight: 1.45,
              color: "#53606d",
            }}
          >
            Manage classes, teach on shared whiteboards, message students, and stay ready when connectivity drops.
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {[
            { label: "Realtime whiteboards", bg: "#e8f3ff" },
            { label: "Class messaging", bg: "#ffffff" },
            { label: "Offline-ready workflows", bg: "#ffffff" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid rgba(0, 0, 0, 0.08)", // Ink hairline
                background: item.bg,
                fontSize: "20px",
                fontWeight: 500,
                color: "#17202a",
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
