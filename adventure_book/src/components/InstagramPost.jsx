import { GF, IGF } from "../lib/constants.js";
import { formatDate, normPhoto } from "../lib/helpers.js";
import AvatarCircle from "./AvatarCircle.jsx";

export default function InstagramPost({ entry, photoIdx, onBack, avatars }) {
  const photos = (entry.photos || []).map((p, i) => normPhoto(p, i));
  const paragraphs = (entry.journal || "").split(/\n\n+/).filter(Boolean);
  const username = "@" + ((entry.title || "adventure").toLowerCase().replace(/\s+/g, "_"));
  const firstSrc = entry.profilePhoto || photos[0]?.src || null;
  const visiblePhotos = photos.slice(photoIdx);

  if (!visiblePhotos.length) return <div style={{ background: "#000", minHeight: "100vh" }} />;

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "white", fontFamily: IGF }}>
      <style>{GF}</style>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, background: "#000", zIndex: 100 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.3rem" }}>←</button>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>Posts</span>
        </div>
        {visiblePhotos.map((photo, vi) => {
          const realIdx = photoIdx + vi;
          const caption = paragraphs[realIdx] || "";
          const comments = photo.comments || [];
          return (
            <div key={realIdx} style={{ borderBottom: "1px solid #262626", marginBottom: "4px" }}>
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {firstSrc ? <img src={firstSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
                </div>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{username}</span>
              </div>
              <img src={photo.src} alt="" style={{ width: "100%", display: "block", maxHeight: "480px", objectFit: "cover" }} />
              <div style={{ padding: "12px 14px 6px", display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ fontSize: "1.8rem" }}>❤️</span>
                <span style={{ fontSize: "1.4rem", opacity: 0.4 }}>💬</span>
                <span style={{ fontSize: "1.4rem", opacity: 0.4 }}>✈️</span>
                <span style={{ fontSize: "1.4rem", marginLeft: "auto", opacity: 0.4 }}>🔖</span>
              </div>
              {caption && (
                <div style={{ padding: "2px 14px 10px", fontSize: "0.9rem", lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700 }}>{username}{" "}</span>
                  <span style={{ color: "#e0e0e0" }}>{caption}</span>
                </div>
              )}
              {realIdx === 0 && entry.date && (
                <div style={{ padding: "0 14px 10px", fontSize: "0.72rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {formatDate(entry.date)}
                </div>
              )}
              {comments.length > 0 && <div style={{ height: "1px", background: "#262626", margin: "0 0 6px 0" }} />}
              {comments.map((c, i) => (
                <div key={i} style={{ padding: "4px 14px 8px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <AvatarCircle src={avatars[c.user]} name={c.user} size={28} />
                  <div style={{ fontSize: "0.88rem", lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 700 }}>{c.user}{" "}</span>
                    <span style={{ color: "#e0e0e0" }}>{c.text}</span>
                  </div>
                </div>
              ))}
              <div style={{ height: "8px" }} />
            </div>
          );
        })}
        <div style={{ height: "48px" }} />
      </div>
    </div>
  );
}
