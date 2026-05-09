import { useRef, useState } from "react";
import { THEMES, GF, S } from "../lib/constants.js";
import { formatDate, normPhoto } from "../lib/helpers.js";
import { downloadElementAsPdf } from "../lib/pdf.js";

// Floats photos within the journal text using the same paragraph-anchor logic as the prototype.
function renderJournal(paragraphs, photos, t) {
  if (!photos.length && !paragraphs.length) {
    return <p style={{ color: t.accent, fontStyle: "italic", opacity: 0.7 }}>No journal entry yet.</p>;
  }
  if (!photos.length) {
    return paragraphs.map((p, i) => (
      <p key={i} style={{ margin: "0 0 1em 0", whiteSpace: "pre-wrap" }}>{p}</p>
    ));
  }
  const els = [];
  const numP = paragraphs.length;
  for (let i = 0; i <= numP; i++) {
    const here = photos.filter((ph) => {
      const para = ph.para !== undefined ? ph.para : 0;
      return i < numP ? para === i : para >= numP;
    });
    here.forEach((ph, j) => {
      if (ph.align === "full") {
        els.push(<div key={"cf" + i + j} style={{ clear: "both" }} />);
        els.push(
          <div key={"ph" + i + j} style={{ margin: "12px 0 20px 0" }}>
            <img src={ph.src} alt="" crossOrigin="anonymous" style={{ width: "100%", borderRadius: "10px", border: "3px solid " + t.border, display: "block" }} />
          </div>
        );
      } else {
        const L = ph.align !== "right";
        els.push(
          <div
            key={"ph" + i + j}
            style={{
              float: L ? "left" : "right",
              margin: L ? "6px 22px 16px 0" : "6px 0 16px 22px",
              maxWidth: "44%",
            }}
          >
            <img
              src={ph.src}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "100%", borderRadius: "8px",
                border: "3px solid " + t.border,
                transform: "rotate(" + (L ? -1.8 : 1.8) + "deg)",
                display: "block",
              }}
            />
          </div>
        );
      }
    });
    if (i < numP) {
      els.push(
        <p key={"p" + i} style={{ margin: "0 0 1em 0", whiteSpace: "pre-wrap" }}>{paragraphs[i]}</p>
      );
    }
  }
  els.push(<div key="cf-end" style={{ clear: "both" }} />);
  return els;
}

export default function EntryView({ entry, onBack, onEdit, onDelete }) {
  const t = entry.customTheme || THEMES[entry.theme] || THEMES["Golden Hour"];
  const photos = (entry.photos || []).map((p, i) => normPhoto(p, i));
  const paragraphs = (entry.journal || "").split(/\n\n+/).filter(Boolean);
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef();

  async function downloadPDF() {
    setGenerating(true);
    try {
      await downloadElementAsPdf(pdfRef.current, entry.title || "adventure", { background: t.bg });
    } catch (err) {
      console.error("PDF:", err);
      alert("PDF failed: " + err.message);
    }
    setGenerating(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Lora',serif" }}>
      <style>{GF + " @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"}</style>
      <div style={{ background: "linear-gradient(135deg," + t.header + "," + t.accent + ")", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 14px " + t.border + "88", flexWrap: "wrap", gap: "8px" }}>
        <button onClick={onBack} style={S.btn("rgba(255,255,255,0.15)", "white")}>← Contents</button>
        <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.7rem", color: "white", fontWeight: 700, textAlign: "center" }}>
          🎈 {entry.title}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onEdit} style={S.btn("rgba(255,255,255,0.15)", "white")}>✏️ Edit</button>
          <button onClick={downloadPDF} disabled={generating} style={S.btn("rgba(255,255,255,0.15)", "white", { opacity: generating ? 0.6 : 1 })}>
            {generating ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> : "⬇️"} PDF
          </button>
          <button onClick={onDelete} style={S.btn("rgba(229,62,62,0.5)", "white")}>🗑️</button>
        </div>
      </div>
      <div ref={pdfRef} style={{ maxWidth: "820px", margin: "0 auto", padding: "30px 20px", background: t.bg }}>
        <div style={{ ...S.card(t), marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <h1 style={{ fontFamily: "'Caveat',cursive", fontSize: "2.6rem", color: t.text, margin: 0, fontWeight: 700 }}>{entry.title}</h1>
            <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.1rem", color: t.accent, background: t.bg, padding: "5px 14px", borderRadius: "20px", border: "1.5px solid " + t.border, whiteSpace: "nowrap" }}>
              📅 {formatDate(entry.date)}
            </div>
          </div>
          {entry.caption && (
            <div style={{ fontStyle: "italic", color: t.accent, fontSize: "1.08rem", borderLeft: "3px solid " + t.border, paddingLeft: "14px", marginBottom: "10px" }}>
              {entry.caption}
            </div>
          )}
          {entry.customTheme && (
            <div style={{ fontSize: "0.82rem", color: t.accent, opacity: 0.7, marginTop: "4px" }}>
              🎨 Palette from your photos
            </div>
          )}
          {entry.stickers?.length > 0 && (
            <div style={{ fontSize: "1.7rem", letterSpacing: "6px", marginTop: "8px" }}>{entry.stickers.join(" ")}</div>
          )}
        </div>
        <div style={S.card(t)}>
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.35rem", color: t.accent, marginBottom: "18px", fontWeight: 600, borderBottom: "1px solid " + t.border, paddingBottom: "10px" }}>
            📝 Journal Entry
          </div>
          <div style={{ color: t.text, fontSize: "1.05rem", lineHeight: "1.95" }}>
            {renderJournal(paragraphs, photos, t)}
          </div>
        </div>
      </div>
    </div>
  );
}
