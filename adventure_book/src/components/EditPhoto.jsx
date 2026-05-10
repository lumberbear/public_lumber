import { useRef, useState } from "react";
import { api } from "../lib/api.js";

export default function EditPhoto({ photo, t, numParas, onAttr, onRemove, onDragStart, onReplace, badge, showCaption }) {
  const [show, setShow] = useState(false);
  const replaceRef = useRef();
  const isFull = photo.align === "full";
  const isLeft = photo.align !== "right";

  async function handleReplace(e) {
    const f = e.target.files[0];
    if (!f) return;
    const u = await api.uploadOnePhoto(f);
    onReplace(u);
    e.target.value = "";
  }

  const wrap = isFull
    ? { position: "relative", clear: "both", margin: "12px 0 18px 0", cursor: "grab" }
    : { position: "relative", float: isLeft ? "left" : "right", margin: isLeft ? "4px 18px 16px 0" : "4px 0 16px 18px", maxWidth: "43%", cursor: "grab" };

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={wrap}
    >
      <div style={{ position: "relative" }}>
        {badge && (
          <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,0.65)", color: "white", borderRadius: "12px", padding: "2px 10px", fontFamily: "'Caveat',cursive", fontSize: "0.8rem", zIndex: 2 }}>
            {"📸 Post " + badge}
          </div>
        )}
        <img
          src={photo.src}
          alt=""
          style={{
            width: "100%",
            borderRadius: isFull ? "10px" : "8px",
            border: "3px solid " + (show ? t.accent : t.border),
            display: "block",
            transform: isFull ? "none" : "rotate(" + (isLeft ? -1.8 : 1.8) + "deg)",
            transition: "border-color 0.15s",
          }}
        />
        <div style={{
          position: "absolute", top: "4px", left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.5)", borderRadius: "6px", padding: "2px 8px",
          fontFamily: "'Caveat',cursive", fontSize: "0.7rem", color: "white",
          opacity: show ? 1 : 0, transition: "opacity 0.15s",
          whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          ⠿ drag to move
        </div>
      </div>
      <div style={{ marginTop: "5px", display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
        {["left", "right", "full"].map((a) => (
          <button
            key={a}
            onClick={() => onAttr("align", a)}
            style={{
              padding: "2px 7px", borderRadius: "4px",
              border: "1.5px solid " + (photo.align === a ? t.accent : t.border),
              background: photo.align === a ? t.accent : t.paper,
              color: photo.align === a ? "white" : t.text,
              cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "0.78rem",
              transition: "all 0.1s",
            }}
          >
            {a === "left" ? "◧ L" : a === "right" ? "◨ R" : "▬ Full"}
          </button>
        ))}
        <button
          onClick={() => onAttr("para", Math.max(0, (photo.para || 0) - 1))}
          style={{ padding: "2px 7px", borderRadius: "4px", border: "1px solid " + t.border, background: t.paper, color: t.text, cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "0.82rem" }}
        >↑</button>
        <button
          onClick={() => onAttr("para", Math.min(numParas, (photo.para || 0) + 1))}
          style={{ padding: "2px 7px", borderRadius: "4px", border: "1px solid " + t.border, background: t.paper, color: t.text, cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "0.82rem" }}
        >↓</button>
        <button
          onClick={() => replaceRef.current.click()}
          style={{ padding: "2px 7px", borderRadius: "4px", border: "1px solid " + t.border, background: t.paper, color: t.text, cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "0.82rem" }}
        >🔄</button>
        <button
          onClick={onRemove}
          style={{ padding: "2px 7px", borderRadius: "4px", border: "1px solid #fca5a5", background: "white", color: "#e53e3e", cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "0.82rem" }}
        >✕</button>
      </div>
      {showCaption && (
        <input
          value={photo.caption || ""}
          onChange={(e) => onAttr("caption", e.target.value)}
          placeholder="Photo caption…"
          style={{
            display: "block",
            width: "100%",
            marginTop: "6px",
            padding: "4px 8px",
            border: "1px solid " + t.border,
            borderRadius: "4px",
            background: t.paper,
            color: t.text,
            fontFamily: "'Lora',serif",
            fontStyle: "italic",
            fontSize: "0.82rem",
            outline: "none",
          }}
        />
      )}
      <input ref={replaceRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleReplace} />
    </div>
  );
}
