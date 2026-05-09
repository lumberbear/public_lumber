import { useRef } from "react";
import { PAV_COLORS } from "../lib/constants.js";
import { api } from "../lib/api.js";

// onChange receives the new photo id (or null) once upload completes.
export default function AvatarUploader({ name, src, onChange }) {
  const ref = useRef();
  const bg = PAV_COLORS[name] || "#555";
  const initial = (name || "?")[0].toUpperCase();

  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const uploaded = await api.uploadOnePhoto(f);
    onChange(uploaded.id, uploaded.src);
    e.target.value = "";
  }

  const shortName = name.length > 12 ? name.slice(0, 12) + "…" : name;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer" }}
      onClick={() => ref.current.click()}
    >
      <div
        style={{
          width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
          background: bg, display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid rgba(255,255,255,0.5)",
        }}
      >
        {src ? (
          <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "white", fontSize: "20px", fontWeight: 700 }}>{initial}</span>
        )}
      </div>
      <span
        style={{
          color: "rgba(255,255,255,0.75)", fontSize: "0.62rem",
          fontFamily: "'Caveat',cursive", textAlign: "center",
          maxWidth: "64px", lineHeight: 1.2,
        }}
      >
        {shortName}
      </span>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}
