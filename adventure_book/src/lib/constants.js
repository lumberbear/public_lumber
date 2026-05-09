export const THEMES = {
  "Golden Hour":    { bg: "#fdf6e3", paper: "#fffdf5", accent: "#c2842a", text: "#5c3d11", border: "#e8c878", header: "#8B4513" },
  "Rose Garden":    { bg: "#fff0f3", paper: "#fff8fa", accent: "#c2185b", text: "#7b1f3a", border: "#f8c8d8", header: "#9c1040" },
  "Lavender Dream": { bg: "#f3f0ff", paper: "#faf8ff", accent: "#6d3fc0", text: "#3d1f8a", border: "#d4c8f8", header: "#4a2888" },
  "Midnight Stars": { bg: "#0f0c2e", paper: "#1a1645", accent: "#9d8ff0", text: "#e8e0ff", border: "#3d35a0", header: "#1a1260" },
};

export const STICKERS = ["💕","🎈","✨","🌻","🏠","❤️","🗺️","📷","🌸","⭐","🌈","🦋","🍃","🕊️","🌅","🎶"];

export const PROFILES = ["Ollythebigbear", "Lillythebabyelephant"];

export const PAV_COLORS = {
  Ollythebigbear: "#4a90d9",
  Lillythebabyelephant: "#e879a0",
};

export const GF =
  "@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');*{box-sizing:border-box}";

export const IGF = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif";

export const S = {
  btn: (bg, color, ex = {}) => ({
    background: bg, color, border: "none", borderRadius: "8px",
    padding: "8px 16px", cursor: "pointer", fontFamily: "'Caveat',cursive",
    fontSize: "1rem", ...ex,
  }),
  card: (t) => ({
    background: t.paper, borderRadius: "12px", padding: "22px",
    border: "2px solid " + t.border, boxShadow: "0 2px 10px " + t.border + "55",
  }),
  inp: (t) => ({
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "2px solid " + t.border, background: t.bg, color: t.text,
    fontFamily: "'Lora',serif", fontSize: "0.95rem", outline: "none",
    display: "block", marginTop: "4px",
  }),
  lbl: (t) => ({
    fontFamily: "'Caveat',cursive", fontSize: "1.1rem", color: t.accent,
    fontWeight: 600, display: "block", marginBottom: "6px",
  }),
};
