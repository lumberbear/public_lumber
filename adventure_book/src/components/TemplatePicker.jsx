import { useState } from "react";
import { THEMES, GF, S } from "../lib/constants.js";
import PrevScrapbook from "./previews/PrevScrapbook.jsx";
import PrevInstagram from "./previews/PrevInstagram.jsx";
import PrevPostcard from "./previews/PrevPostcard.jsx";
import PrevNewspaper from "./previews/PrevNewspaper.jsx";
import PrevMenu from "./previews/PrevMenu.jsx";
import PrevBlog from "./previews/PrevBlog.jsx";
import PrevReceipt from "./previews/PrevReceipt.jsx";
import PrevItinerary from "./previews/PrevItinerary.jsx";
import PrevFilm from "./previews/PrevFilm.jsx";
import PrevFairytale from "./previews/PrevFairytale.jsx";

export const TEMPLATES = [
  { id: "scrapbook",  label: "Scrapbook",   icon: "📖", desc: "Photos & journal wrapped together on a dreamy page",    ready: true,  Prev: PrevScrapbook },
  { id: "instagram",  label: "Instagram",   icon: "📱", desc: "Dark-mode profile grid with posts, captions & comments", ready: true,  Prev: PrevInstagram },
  { id: "postcard",   label: "Postcard",    icon: "📮", desc: "A handwritten note with a stamp — classic & romantic",  ready: false, Prev: PrevPostcard },
  { id: "newspaper",  label: "Newspaper",   icon: "📰", desc: "Your weekend as a dramatic front-page headline",        ready: false, Prev: PrevNewspaper },
  { id: "menu",       label: "Menu",        icon: "🍽️", desc: "Your day as a restaurant menu — starters to dessert",   ready: false, Prev: PrevMenu },
  { id: "blogpost",   label: "Blog Post",   icon: "📝", desc: "Hero image, title, subheadings — tell your story",      ready: false, Prev: PrevBlog },
  { id: "receipt",    label: "Receipt",     icon: "🧾", desc: "Every moment itemised — date, event, cost in smiles",   ready: false, Prev: PrevReceipt },
  { id: "itinerary",  label: "Itinerary",   icon: "🗺️", desc: "Time-stamped stops on your weekend adventure",          ready: false, Prev: PrevItinerary },
  { id: "filmreview", label: "Film Review", icon: "🎞️", desc: "Your weekend as a movie — poster, synopsis, stars",     ready: false, Prev: PrevFilm },
  { id: "fairytale",  label: "Fairy Tale",  icon: "📖", desc: '"Once upon a time…" — your weekend as a storybook',    ready: false, Prev: PrevFairytale },
];

export default function TemplatePicker({ onPick, onBack }) {
  const [hovered, setHovered] = useState(null);
  const t = THEMES["Golden Hour"];
  return (
    <div style={{ minHeight: "100vh", background: "#fdf6e3", fontFamily: "'Lora',serif" }}>
      <style>{GF}</style>
      <div style={{ background: "linear-gradient(135deg,#8B4513,#c2842a)", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 14px rgba(139,69,19,0.3)" }}>
        <button onClick={onBack} style={S.btn("rgba(255,255,255,0.15)", "white")}>← Back</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: "2rem", color: "white", fontWeight: 700 }}>Choose a Template</div>
          <div style={{ color: "#fde68a", fontSize: "0.9rem", fontStyle: "italic" }}>How do you want to tell this adventure?</div>
        </div>
        <div style={{ width: "80px" }} />
      </div>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "18px" }}>
          {TEMPLATES.map((tmpl) => {
            const isHov = hovered === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => tmpl.ready && onPick(tmpl.id)}
                onMouseEnter={() => setHovered(tmpl.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderRadius: "14px",
                  border: "2px solid " + (isHov && tmpl.ready ? t.accent : t.border),
                  background: t.paper,
                  overflow: "hidden",
                  cursor: tmpl.ready ? "pointer" : "default",
                  transition: "all 0.18s",
                  transform: isHov && tmpl.ready ? "translateY(-4px) scale(1.02)" : "none",
                  boxShadow: isHov && tmpl.ready ? "0 10px 28px " + t.border + "99" : "0 2px 8px " + t.border + "44",
                  opacity: tmpl.ready ? 1 : 0.72,
                  position: "relative",
                }}
              >
                <div style={{ height: "120px", padding: "10px", background: t.bg }}>
                  <tmpl.Prev t={t} />
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.3rem" }}>{tmpl.icon}</span>
                    <span style={{ fontFamily: "'Caveat',cursive", fontSize: "1.25rem", fontWeight: 700, color: t.text }}>{tmpl.label}</span>
                    {tmpl.ready && (
                      <span style={{ marginLeft: "auto", fontSize: "0.7rem", background: t.accent, color: "white", borderRadius: "8px", padding: "1px 8px", fontFamily: "'Caveat',cursive" }}>Ready</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: t.accent, fontStyle: "italic", lineHeight: 1.4 }}>{tmpl.desc}</div>
                </div>
                {!tmpl.ready && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(253,246,227,0.55)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "rgba(139,69,19,0.85)", color: "white", fontFamily: "'Caveat',cursive", fontSize: "1rem", padding: "5px 16px", borderRadius: "20px", fontWeight: 600 }}>Coming Soon</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
