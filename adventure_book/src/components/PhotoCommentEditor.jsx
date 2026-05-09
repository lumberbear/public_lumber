import { useState } from "react";
import { PROFILES, IGF } from "../lib/constants.js";
import AvatarCircle from "./AvatarCircle.jsx";

export default function PhotoCommentEditor({ comments, avatars, onAdd, onRemove }) {
  const [sel, setSel] = useState(PROFILES[0]);
  const [text, setText] = useState("");

  function add() {
    if (!text.trim()) return;
    onAdd({ user: sel, text: text.trim() });
    setText("");
  }

  return (
    <div style={{ background: "#111", borderRadius: "8px", padding: "10px 12px", margin: "6px 0 14px 0" }}>
      <div style={{ fontFamily: "'Caveat',cursive", color: "#888", fontSize: "0.85rem", marginBottom: "8px" }}>
        💬 Comments for this post
      </div>
      {(comments || []).map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <AvatarCircle src={avatars[c.user]} name={c.user} size={24} />
          <span style={{ color: "white", fontSize: "0.82rem", flex: 1, lineHeight: 1.4 }}>
            <strong>{c.user}</strong>{" "}{c.text}
          </span>
          <button
            onClick={() => onRemove(i)}
            style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "0.75rem", padding: "0 4px", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      ))}
      <div
        style={{
          display: "flex", gap: "6px", alignItems: "center",
          marginTop: (comments || []).length > 0 ? "10px" : "0",
        }}
      >
        {PROFILES.map((p) => (
          <div
            key={p}
            onClick={() => setSel(p)}
            title={p}
            style={{
              cursor: "pointer", borderRadius: "50%",
              outline: sel === p ? "2px solid white" : "2px solid transparent",
              outlineOffset: "2px", flexShrink: 0,
            }}
          >
            <AvatarCircle src={avatars[p]} name={p} size={28} />
          </div>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={"As " + (sel.length > 14 ? sel.slice(0, 14) + "…" : sel) + "…"}
          style={{
            flex: 1, background: "#222", border: "1px solid #444", color: "white",
            borderRadius: "20px", padding: "6px 12px", outline: "none",
            fontSize: "0.85rem", fontFamily: IGF,
          }}
        />
        <button
          onClick={add}
          style={{
            background: "#3897f0", color: "white", border: "none", borderRadius: "6px",
            padding: "6px 12px", cursor: "pointer", fontFamily: "'Caveat',cursive",
            fontSize: "0.9rem", flexShrink: 0,
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}
