import { useState } from "react";

export default function DropZone({ paraIdx, onDrop, t }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { onDrop(paraIdx); setOver(false); }}
      style={{
        height: over ? "42px" : "10px",
        borderRadius: "6px",
        border: "2px dashed " + (over ? t.accent : t.border),
        background: over ? t.accent + "22" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", opacity: over ? 1 : 0.35, margin: "3px 0",
      }}
    >
      {over && (
        <span style={{ fontFamily: "'Caveat',cursive", color: t.accent, fontSize: "0.9rem", pointerEvents: "none" }}>
          📷 Drop photo here
        </span>
      )}
    </div>
  );
}
