import { useRef } from "react";
import { api } from "../lib/api.js";

// onChange receives ({ id, src }) once upload completes.
export default function ProfilePhotoUploader({ src, onChange, t }) {
  const ref = useRef();

  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const u = await api.uploadOnePhoto(f);
    onChange(u);
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
      <div
        onClick={() => ref.current.click()}
        style={{
          width: "72px", height: "72px", borderRadius: "50%",
          overflow: "hidden", background: "#222",
          border: "2px dashed " + t.border,
          cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}
      >
        {src ? (
          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: "1.8rem" }}>👤</span>
        )}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
        >
          <span style={{ color: "white", fontSize: "1.2rem" }}>📷</span>
        </div>
      </div>
      <div style={{ fontFamily: "'Caveat',cursive", color: t.accent, fontSize: "1rem", lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600 }}>Profile Photo</div>
        <div style={{ opacity: 0.7, fontSize: "0.9rem" }}>Click the circle to upload</div>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}
