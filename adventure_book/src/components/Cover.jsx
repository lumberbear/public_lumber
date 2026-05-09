import { useEffect, useRef, useState } from "react";
import { GF } from "../lib/constants.js";
import { api } from "../lib/api.js";
import UpCoverScene from "./UpCoverScene.jsx";

export default function Cover({ onOpen }) {
  const [coverSrc, setCoverSrc] = useState(null);
  const ref = useRef();

  useEffect(() => {
    api.getSetting("cover_photo_id").then((r) => {
      if (!r?.value) return;
      api.getPhotoUrl(r.value).then(setCoverSrc).catch(() => {});
    }).catch(() => {});
  }, []);

  async function onChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const u = await api.uploadOnePhoto(f);
    await api.setSetting("cover_photo_id", u.id);
    setCoverSrc(u.src);
  }

  return (
    <div
      onClick={onOpen}
      style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Caveat',cursive", position: "relative", overflow: "hidden",
        cursor: "pointer",
        background: coverSrc ? "black" : "radial-gradient(ellipse at 38% 38%,#7a4520,#4a2208 40%,#220e02)",
      }}
    >
      <style>{GF}</style>
      {coverSrc ? (
        <>
          <img
            src={coverSrc}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
        </>
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(17deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.65))", pointerEvents: "none" }} />
          <UpCoverScene />
          <div style={{ color: "#c8a050", fontSize: "1rem", fontStyle: "italic", marginTop: "8px", opacity: 0.8, textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
            "dedicated to our greatest adventure yet"
          </div>
        </>
      )}
      {/* Right-click the cover to choose a new image. Hidden file input keeps the click-to-open primary. */}
      <button
        onClick={(e) => { e.stopPropagation(); ref.current.click(); }}
        style={{
          position: "absolute", bottom: "20px", right: "20px",
          background: "rgba(255,255,255,0.15)", color: "white",
          border: "1px solid rgba(255,255,255,0.3)", borderRadius: "20px",
          padding: "6px 14px", cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "0.9rem",
        }}
      >
        📷 Change cover
      </button>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onChange} />
    </div>
  );
}
