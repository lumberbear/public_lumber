import { useRef, useState } from "react";
import { GF, IGF } from "../lib/constants.js";
import { formatDate, normPhoto } from "../lib/helpers.js";
import { downloadElementAsPdf } from "../lib/pdf.js";
import AvatarCircle from "./AvatarCircle.jsx";

// Off-screen feed renderer used only for PDF capture (matches what users actually want printed:
// the posts as a scrollable feed, not the grid).
function PdfFeed({ entry, photos, paragraphs, username, firstSrc, avatars }) {
  return (
    <div style={{ width: "480px", background: "#000", color: "white", fontFamily: IGF, paddingBottom: "12px" }}>
      <div style={{ padding: "20px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "12px" }}>
          <div style={{ width: "86px", height: "86px", borderRadius: "50%", overflow: "hidden", background: "#222", border: "1px solid #333", flexShrink: 0 }}>
            {firstSrc ? <img src={firstSrc} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{username}</div>
            {entry.caption && <div style={{ fontSize: "0.85rem", color: "#bbb", marginTop: "4px", maxWidth: "260px" }}>{entry.caption}</div>}
            {entry.stickers?.length > 0 && (
              <div style={{ fontSize: "1rem", letterSpacing: "3px", marginTop: "6px" }}>{entry.stickers.join(" ")}</div>
            )}
          </div>
        </div>
      </div>
      {photos.map((photo, i) => {
        const caption = paragraphs[i] || "";
        const comments = photo.comments || [];
        return (
          <div key={i} style={{ borderTop: "1px solid #262626" }}>
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0 }}>
                {firstSrc ? <img src={firstSrc} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{username}</span>
            </div>
            <img src={photo.src} alt="" crossOrigin="anonymous" style={{ width: "100%", display: "block" }} />
            <div style={{ padding: "10px 14px 4px", fontSize: "1.4rem" }}>❤️</div>
            {caption && (
              <div style={{ padding: "2px 14px 10px", fontSize: "0.9rem", lineHeight: 1.55 }}>
                <span style={{ fontWeight: 700 }}>{username}{" "}</span>
                <span style={{ color: "#e0e0e0" }}>{caption}</span>
              </div>
            )}
            {i === 0 && entry.date && (
              <div style={{ padding: "0 14px 10px", fontSize: "0.7rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {formatDate(entry.date)}
              </div>
            )}
            {comments.map((c, ci) => (
              <div key={ci} style={{ padding: "4px 14px 8px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <AvatarCircle src={avatars[c.user]} name={c.user} size={28} />
                <div style={{ fontSize: "0.88rem", lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 700 }}>{c.user}{" "}</span>
                  <span style={{ color: "#e0e0e0" }}>{c.text}</span>
                </div>
              </div>
            ))}
            <div style={{ height: "10px" }} />
          </div>
        );
      })}
    </div>
  );
}

export default function InstagramProfile({ entry, onBack, onEdit, onDelete, onOpenPost, avatars }) {
  const photos = (entry.photos || []).map((p, i) => normPhoto(p, i));
  const firstSrc = entry.profilePhoto || photos[0]?.src || null;
  const username = "@" + ((entry.title || "adventure").toLowerCase().replace(/\s+/g, "_"));
  const paragraphs = (entry.journal || "").split(/\n\n+/).filter(Boolean);
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef();

  async function downloadPDF() {
    setGenerating(true);
    try {
      await downloadElementAsPdf(pdfRef.current, entry.title || "instagram", { background: "#000" });
    } catch (err) {
      console.error("PDF:", err);
      alert("PDF failed: " + err.message);
    }
    setGenerating(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "white", fontFamily: IGF }}>
      <style>{GF + " @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"}</style>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#000", zIndex: 100 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem", padding: "4px 8px" }}>←</button>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>{username}</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={downloadPDF} disabled={generating} style={{ background: "none", border: "none", color: generating ? "#555" : "white", cursor: generating ? "default" : "pointer", fontSize: "1.1rem" }}>
              {generating ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> : "⬇️"}
            </button>
            <button onClick={onEdit} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.1rem" }}>✏️</button>
            <button onClick={onDelete} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.1rem" }}>🗑️</button>
          </div>
        </div>
        <div style={{ padding: "20px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "28px", marginBottom: "14px" }}>
            <div style={{ width: "86px", height: "86px", borderRadius: "50%", overflow: "hidden", background: "#222", border: "1px solid #333", flexShrink: 0 }}>
              {firstSrc ? (
                <img src={firstSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>👤</div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "12px" }}>{username}</div>
              <button onClick={onEdit} style={{ background: "#262626", color: "white", border: "1px solid #363636", borderRadius: "8px", padding: "7px 22px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: IGF }}>
                Edit Profile
              </button>
            </div>
          </div>
          {entry.caption && <div style={{ fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "6px" }}>{entry.caption}</div>}
          {entry.stickers?.length > 0 && (
            <div style={{ fontSize: "1.2rem", letterSpacing: "3px", marginBottom: "6px" }}>{entry.stickers.join(" ")}</div>
          )}
        </div>
        <div style={{ borderTop: "1px solid #262626", display: "flex", justifyContent: "center", padding: "10px 0", marginBottom: "2px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px", color: "white", borderTop: "1px solid white", paddingTop: "10px" }}>POSTS</span>
        </div>
        {photos.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555", padding: "80px 20px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📷</div>
            <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.3rem" }}>No posts yet</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "2px" }}>
            {photos.map((ph, i) => (
              <div
                key={i}
                onClick={() => onOpenPost(i)}
                style={{ position: "relative", paddingBottom: "100%", cursor: "pointer", overflow: "hidden", background: "#111" }}
              >
                <img src={ph.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}
        <div style={{ height: "48px" }} />
      </div>
      {/* Off-screen PDF target. Rendered hidden so it doesn't affect layout but html2canvas can capture it. */}
      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={pdfRef}>
          <PdfFeed
            entry={entry}
            photos={photos}
            paragraphs={paragraphs}
            username={username}
            firstSrc={firstSrc}
            avatars={avatars}
          />
        </div>
      </div>
    </div>
  );
}
