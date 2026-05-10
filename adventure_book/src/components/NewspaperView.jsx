import { useRef, useState } from "react";
import { THEMES, S } from "../lib/constants.js";
import { formatDate, normPhoto } from "../lib/helpers.js";
import { downloadElementAsPdf } from "../lib/pdf.js";

const NEWS_PAPER = "#f4ecd8";
const NEWS_INK = "#1a1a1a";

const NEWS_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');" +
  "*{box-sizing:border-box}";

function renderBody(paragraphs, photos, t) {
  if (!paragraphs.length && !photos.length) {
    return <p style={{ fontStyle: "italic", opacity: 0.6 }}>No journal entry yet.</p>;
  }
  if (!paragraphs.length) {
    return photos.map((ph, j) => <PhotoFigure key={"ph" + j} ph={ph} />);
  }

  const els = [];
  const numP = paragraphs.length;
  for (let i = 0; i <= numP; i++) {
    const here = photos.filter((ph) => {
      const para = ph.para !== undefined ? ph.para : 0;
      return i < numP ? para === i : para >= numP;
    });
    here.forEach((ph, j) => {
      els.push(<PhotoFigure key={"ph" + i + "_" + j} ph={ph} />);
    });
    if (i < numP) {
      const text = paragraphs[i];
      if (i === 0 && text.length > 0) {
        const match = text.match(/^(\s*)(\S)([\s\S]*)$/);
        if (match) {
          const [, lead, firstChar, rest] = match;
          els.push(
            <p key={"p" + i} style={paraStyle}>
              {lead}
              <span style={{
                float: "left",
                fontFamily: "'Playfair Display',serif",
                fontWeight: 900,
                fontSize: "4.4rem",
                lineHeight: "0.85",
                color: t.accent,
                paddingRight: "8px",
                paddingTop: "6px",
                marginBottom: "-6px",
              }}>
                {firstChar}
              </span>
              {rest}
            </p>
          );
          continue;
        }
      }
      els.push(<p key={"p" + i} style={paraStyle}>{text}</p>);
    }
  }
  return els;
}

const paraStyle = { margin: "0 0 1em 0", whiteSpace: "pre-wrap" };

function PhotoFigure({ ph }) {
  const isFull = ph.align === "full";
  const isRight = ph.align === "right";
  const style = isFull
    ? { margin: "10px 0 16px 0", columnSpan: "all", breakInside: "avoid" }
    : isRight
      ? { float: "right", margin: "4px 0 12px 14px", maxWidth: "92%", breakInside: "avoid" }
      : { float: "left", margin: "4px 14px 12px 0", maxWidth: "92%", breakInside: "avoid" };
  return (
    <figure style={style}>
      <img
        src={ph.src}
        alt=""
        crossOrigin="anonymous"
        style={{ width: "100%", display: "block", border: "1px solid " + NEWS_INK }}
      />
    </figure>
  );
}

export default function NewspaperView({ entry, onBack, onEdit, onDelete }) {
  const t = entry.customTheme || THEMES[entry.theme] || THEMES["Golden Hour"];
  const allPhotos = (entry.photos || []).map((p, i) => normPhoto(p, i));
  const heroPhoto = allPhotos[0] || null;
  const inlinePhotos = allPhotos.slice(1);
  const paragraphs = (entry.journal || "").split(/\n\n+/).filter(Boolean);
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef();

  async function downloadPDF() {
    setGenerating(true);
    try {
      await downloadElementAsPdf(pdfRef.current, entry.title || "adventure", { background: NEWS_PAPER });
    } catch (err) {
      console.error("PDF:", err);
      alert("PDF failed: " + err.message);
    }
    setGenerating(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: NEWS_PAPER, fontFamily: "'Lora',serif" }}>
      <style>{NEWS_FONTS + " @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"}</style>

      <div style={{
        background: "linear-gradient(135deg," + t.header + "," + t.accent + ")",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 14px " + t.border + "88",
        flexWrap: "wrap",
        gap: "8px",
      }}>
        <button onClick={onBack} style={S.btn("rgba(255,255,255,0.15)", "white")}>← Contents</button>
        <div style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "1.4rem",
          color: "white",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: "1.5px",
        }}>
          📰 {entry.title}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onEdit} style={S.btn("rgba(255,255,255,0.15)", "white")}>✏️ Edit</button>
          <button
            onClick={downloadPDF}
            disabled={generating}
            style={S.btn("rgba(255,255,255,0.15)", "white", { opacity: generating ? 0.6 : 1 })}
          >
            {generating ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> : "⬇️"} PDF
          </button>
          <button onClick={onDelete} style={S.btn("rgba(229,62,62,0.5)", "white")}>🗑️</button>
        </div>
      </div>

      <div ref={pdfRef} style={{
        background: NEWS_PAPER,
        maxWidth: "880px",
        margin: "0 auto",
        padding: "44px 52px 52px 52px",
      }}>
        <div style={{ textAlign: "center", paddingTop: "4px" }}>
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontWeight: 900,
            fontSize: "3.6rem",
            letterSpacing: "2px",
            color: t.header,
            lineHeight: 1,
          }}>
            THE ADVENTURE GAZETTE
          </div>
        </div>

        <div style={{ borderTop: "3px solid " + t.header, marginTop: "14px" }} />
        <div style={{ borderTop: "1px solid " + t.header, marginTop: "2px" }} />

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 4px",
          fontFamily: "'Lora',serif",
          fontSize: "0.78rem",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: NEWS_INK,
          flexWrap: "wrap",
          gap: "10px",
        }}>
          <span>Vol. I · No. 1</span>
          <span style={{ fontStyle: "italic", textTransform: "none", letterSpacing: "0.5px" }}>
            {formatDate(entry.date) || "Today"}
          </span>
          <span style={{ fontSize: "1rem", letterSpacing: "4px" }}>
            {entry.stickers?.length ? entry.stickers.join(" ") : "★"}
          </span>
        </div>

        <div style={{ borderTop: "1px solid " + NEWS_INK, marginBottom: "36px" }} />

        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontWeight: 700,
          fontSize: "2.7rem",
          color: NEWS_INK,
          margin: 0,
          lineHeight: 1.15,
          letterSpacing: "-0.5px",
        }}>
          {entry.title || "Untitled"}
        </h1>

        {entry.caption && (
          <div style={{
            fontFamily: "'Lora',serif",
            fontStyle: "italic",
            fontSize: "1.18rem",
            color: NEWS_INK,
            opacity: 0.82,
            marginTop: "12px",
            maxWidth: "75%",
            lineHeight: 1.45,
          }}>
            {entry.caption}
          </div>
        )}

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginTop: "20px",
          marginBottom: "24px",
        }}>
          <span style={{
            fontFamily: "'Lora',serif",
            fontWeight: 600,
            fontSize: "0.82rem",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: NEWS_INK,
          }}>
            By The Editors
          </span>
          <span style={{ flex: 1, borderTop: "1px solid " + t.header, opacity: 0.5 }} />
        </div>

        {heroPhoto && (
          <figure style={{ margin: "0 0 28px 0" }}>
            <img
              src={heroPhoto.src}
              alt=""
              crossOrigin="anonymous"
              style={{ width: "100%", display: "block", border: "1px solid " + NEWS_INK }}
            />
          </figure>
        )}

        <div style={{
          columnCount: 2,
          columnGap: "32px",
          columnRule: "1px solid " + t.header + "55",
          fontFamily: "'Lora',serif",
          fontSize: "1.02rem",
          lineHeight: 1.7,
          color: NEWS_INK,
          textAlign: "justify",
          hyphens: "auto",
        }}>
          {renderBody(paragraphs, inlinePhotos, t)}
          <div style={{ clear: "both" }} />
        </div>

        <div style={{
          textAlign: "center",
          marginTop: "36px",
          fontFamily: "'Playfair Display',serif",
          fontStyle: "italic",
          fontSize: "1rem",
          opacity: 0.5,
          color: NEWS_INK,
          letterSpacing: "4px",
        }}>
          — FIN —
        </div>
      </div>
    </div>
  );
}
