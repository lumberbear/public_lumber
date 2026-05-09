import { PAV_COLORS } from "../lib/constants.js";

export default function AvatarCircle({ src, name, size }) {
  const sz = size || 32;
  const bg = PAV_COLORS[name] || "#555";
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      style={{
        width: sz, height: sz, borderRadius: "50%", overflow: "hidden",
        flexShrink: 0, background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ color: "white", fontSize: Math.round(sz * 0.4) + "px", fontWeight: 700 }}>{initial}</span>
      )}
    </div>
  );
}
