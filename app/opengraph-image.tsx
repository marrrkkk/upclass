import { ImageResponse } from "next/og"

export const alt = "UpClass learning management system preview"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

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
          background:
            "radial-gradient(circle at top left, rgba(96, 165, 250, 0.34), transparent 28%), radial-gradient(circle at 82% 18%, rgba(34, 211, 238, 0.26), transparent 24%), linear-gradient(135deg, #eff6ff 0%, #ffffff 54%, #e0f2fe 100%)",
          color: "#0f172a",
        }}
      >
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
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(37, 99, 235, 0.16)",
              background: "rgba(255, 255, 255, 0.84)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path
                d="M10 22L22 10M22 10H14M22 10V18"
                stroke="rgb(59, 130, 246)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: "34px", fontWeight: 700 }}>UpClass</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "860px" }}>
          <div style={{ fontSize: "22px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#2563eb" }}>
            Focused teaching, not software overhead
          </div>
          <div style={{ fontSize: "70px", lineHeight: 1.02, fontWeight: 800 }}>
            A learning management system built for realtime classrooms
          </div>
          <div style={{ fontSize: "28px", lineHeight: 1.4, color: "#334155" }}>
            Manage classes, teach on shared whiteboards, message students, and stay ready when connectivity drops.
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          {["Realtime whiteboards", "Class messaging", "Offline-ready workflows"].map((label) => (
            <div
              key={label}
              style={{
                padding: "12px 18px",
                borderRadius: "999px",
                border: "1px solid rgba(37, 99, 235, 0.16)",
                background: "rgba(255, 255, 255, 0.76)",
                fontSize: "22px",
                color: "#0f172a",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
