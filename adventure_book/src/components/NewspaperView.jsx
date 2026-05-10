import { useRef, useState } from "react";
import { S } from "../lib/constants.js";
import { formatDate, normPhoto } from "../lib/helpers.js";
import { downloadElementAsPdf } from "../lib/pdf.js";

const NEWS_PAPER = "#f4ecd8";
const NEWS_INK = "#1a1a1a";
const NEWS_RULE = "#1a1a1a";
const NEWS_COL_RULE = "#999";
const NEWS_CAPTION = "#444";
const NAV_BG = "#2a2a2a";

const NEWS_FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');" +
  "*{box-sizing:border-box}";

function shortDateline(d) {
  if (!d) return "";
  try {
    return new Date(d + "T12:00:00")
      .toLocaleDateString("en-US", { month: "long", day: "numeric" })
      .toUpperCase();
  } catch {
    return "";
  }
}

function PhotoFigure({ ph, hideCaption }) {
  const isFull = ph.align === "full";
  const isRight = ph.align === "right";
  const wrapStyle = isFull
    ? { margin: "10px 0 18px 0", columnSpan: "all", breakInside: "avoid" }
    : isRight
      ? { float: "right", margin: "4px 0 14px 16px", maxWidth: "92%", breakInside: "avoid" }
      : { float: "left", margin: "4px 16px 14px 0", maxWidth: "92%", breakInside: "avoid" };
  return (
    <figure style={{ ...wrapStyle, padding: 0 }}>
      <img
        src={ph.src}
        alt=""
        crossOrigin="anonymous"
        style={{ width: "100%", display: "block", border: "1px solid " + NEWS_INK }}
      />
      {!hideCaption && ph.caption && (
        <figcaption style={{
          fontFamily: "'Lora',serif",
          fontStyle: "italic",
          fontSize: "0.85rem",
          color: NEWS_CAPTION,
          marginTop: "5px",
          lineHeight: 1.35,
        }}>
          {ph.caption}
        </figcaption>
      )}
    </figure>
  );
}

const paraStyle = { margin: "0 0 1em 0", whiteSpace: "pre-wrap" };
const datelineStyle = {
  fontFamily: "'Lora',serif",
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  color: NEWS_INK,
};

function renderBody(paragraphs, photos, datelineOpener) {
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
              {datelineOpener && (
                <span style={datelineStyle}>{datelineOpener} — </span>
              )}
              {lead}
              <span style={{
                float: "left",
                fontFamily: "'Playfair Display',serif",
                fontWeight: 900,
                fontSize: "4.4rem",
                lineHeight: "0.85",
                color: NEWS_INK,
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

export default function NewspaperView({ entry, onBack, onEdit, onDelete }) {
  const allPhotos = (entry.photos || []).map((p, i) => normPhoto(p, i));
  const heroPhoto = allPhotos[0] || null;
  const inlinePhotos = allPhotos.slice(1);
  const paragraphs = (entry.journal || "").split(/\n\n+/).filter(Boolean);
  const meta = entry.meta || {};
  const kicker = (meta.kicker || "").trim();
  const byline = (meta.byline || "").trim() || "By The Editors";
  const datelineLocation = (meta.datelineLocation || "").trim();
  const datelineOpener = datelineLocation
    ? (entry.date ? `${datelineLocation}, ${shortDateline(entry.date)}` : datelineLocation)
    : "";

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
        background: NAV_BG,
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        flexWrap: "wrap",
        gap: "8px",
      }}>
        <button onClick={onBack} style={S.btn("rgba(255,255,255,0.12)", "white")}>← Contents</button>
        <div style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "1.3rem",
          color: "white",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: "1.5px",
        }}>
          📰 {entry.title || "Untitled"}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onEdit} style={S.btn("rgba(255,255,255,0.12)", "white")}>✏️ Edit</button>
          <button
            onClick={downloadPDF}
            disabled={generating}
            style={S.btn("rgba(255,255,255,0.12)", "white", { opacity: generating ? 0.6 : 1 })}
          >
            {generating ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> : "⬇️"} PDF
          </button>
          <button onClick={onDelete} style={S.btn("rgba(229,62,62,0.45)", "white")}>🗑️</button>
        </div>
      </div>

      <div ref={pdfRef} style={{
        background: NEWS_PAPER,
        maxWidth: "880px",
        margin: "0 auto",
        padding: "44px 52px 52px 52px",
        color: NEWS_INK,
      }}>
        {kicker && (
          <div style={{
            textAlign: "center",
            fontFamily: "'Lora',serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: NEWS_INK,
            marginBottom: "8px",
          }}>
            {kicker}
          </div>
        )}

        <div style={{ textAlign: "center", paddingTop: "2px" }}>
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontWeight: 900,
            fontSize: "3.6rem",
            letterSpacing: "2px",
            color: NEWS_INK,
            lineHeight: 1,
          }}>
            THE ADVENTURE GAZETTE
          </div>
        </div>

        <div style={{ borderTop: "3px solid " + NEWS_RULE, marginTop: "14px" }} />
        <div style={{ borderTop: "1px solid " + NEWS_RULE, marginTop: "2px" }} />

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
            {entry.stickers?.length ? entry.stickers.join(" ") : "PRICE: ONE SMILE"}
          </span>
        </div>

        <div style={{ borderTop: "1px solid " + NEWS_RULE, marginBottom: "36px" }} />

        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontWeight: 900,
          fontSize: "2.9rem",
          color: NEWS_INK,
          margin: 0,
          lineHeight: 1.1,
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
            opacity: 0.85,
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
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: NEWS_INK,
          }}>
            {byline}
          </span>
          <span style={{ flex: 1, borderTop: "1px solid " + NEWS_INK, opacity: 0.6 }} />
        </div>

        {heroPhoto && (
          <figure style={{ margin: "0 0 28px 0" }}>
            <img
              src={heroPhoto.src}
              alt=""
              crossOrigin="anonymous"
              style={{ width: "100%", display: "block", border: "1px solid " + NEWS_INK }}
            />
            {heroPhoto.caption && (
              <figcaption style={{
                fontFamily: "'Lora',serif",
                fontStyle: "italic",
                fontSize: "0.9rem",
                color: NEWS_CAPTION,
                marginTop: "6px",
                lineHeight: 1.35,
              }}>
                {heroPhoto.caption}
              </figcaption>
            )}
          </figure>
        )}

        <div style={{
          columnCount: 2,
          columnGap: "32px",
          columnRule: "1px solid " + NEWS_COL_RULE,
          fontFamily: "'Lora',serif",
          fontSize: "1.02rem",
          lineHeight: 1.7,
          color: NEWS_INK,
          textAlign: "justify",
          hyphens: "auto",
        }}>
          {renderBody(paragraphs, inlinePhotos, datelineOpener)}
          <div style={{ clear: "both" }} />
        </div>

        <div style={{
          textAlign: "center",
          marginTop: "36px",
          fontSize: "1.4rem",
          color: NEWS_INK,
          lineHeight: 1,
        }}>
          ▪
        </div>
      </div>
    </div>
  );
}
