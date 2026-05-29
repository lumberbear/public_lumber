import { THEMES, GF, S } from "../lib/constants.js";
import { formatDate } from "../lib/helpers.js";

export default function Contents({ entries, onOpen, onNew, onBack, lockedCount = 0, pinUnlocked = false, onOpenLockedFolder, onLockSession }) {
  const totalCount = entries.length + (pinUnlocked ? 0 : lockedCount);
  return (
    <div style={{ minHeight: "100vh", background: "#fdf6e3", fontFamily: "'Lora',serif" }}>
      <style>{GF}</style>
      <div style={{ background: "linear-gradient(135deg,#8B4513,#c2842a)", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 14px rgba(139,69,19,0.3)" }}>
        <button onClick={onBack} style={S.btn("rgba(255,255,255,0.15)", "white")}>← Cover</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: "2rem", color: "white", fontWeight: 700 }}>Our Adventure Book</div>
          <div style={{ color: "#fde68a", fontSize: "0.9rem", fontStyle: "italic" }}>
            {totalCount} adventure{totalCount !== 1 ? "s" : ""} & counting... 🎈
          </div>
        </div>
        <button onClick={onNew} style={S.btn("#fde68a", "#5c3d11", { fontWeight: 700 })}>+ New Adventure</button>
      </div>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 20px" }}>
        <h2 style={{ fontFamily: "'Caveat',cursive", fontSize: "2.4rem", color: "#5c3d11", borderBottom: "2px solid #e8c878", paddingBottom: "10px", marginBottom: "24px", marginTop: 0 }}>
          📋 Contents
        </h2>
        {entries.length === 0 && lockedCount === 0 ? (
          <div style={{ textAlign: "center", color: "#8B6914", padding: "70px 20px" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "14px" }}>🎈</div>
            <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.7rem" }}>No adventures yet!</div>
            <div style={{ fontSize: "1rem", marginTop: "8px", color: "#a07040" }}>
              Click "+ New Adventure" to start your story.
            </div>
          </div>
        ) : (
          entries.map((entry) => {
            const t = entry.customTheme || THEMES[entry.theme] || THEMES["Golden Hour"];
            const first = entry.photos?.[0];
            const thumb = first ? first.src : null;
            const isIG = entry.template === "instagram";
            return (
              <div
                key={entry.id}
                onClick={() => onOpen(entry)}
                style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  padding: "14px 18px", marginBottom: "10px",
                  borderRadius: "10px",
                  background: isIG ? "#111" : "white",
                  border: "2px solid " + (isIG ? "#333" : t.border),
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(6px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    style={{
                      width: "56px", height: "56px", objectFit: "cover",
                      borderRadius: "50%",
                      border: "2px solid " + (isIG ? "#333" : t.border),
                      flexShrink: 0,
                    }}
                    alt=""
                  />
                ) : (
                  <div
                    style={{
                      width: "56px", height: "56px",
                      background: isIG ? "#222" : t.bg,
                      borderRadius: "50%",
                      border: "2px solid " + (isIG ? "#333" : t.border),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.6rem", flexShrink: 0,
                    }}
                  >
                    📷
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.4rem", color: isIG ? "white" : t.text, fontWeight: 600 }}>
                    {isIG ? "@" : ""}{entry.title || "Untitled Adventure"}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: isIG ? "#888" : t.accent }}>{formatDate(entry.date)}</div>
                  {entry.caption && (
                    <div
                      style={{
                        fontSize: "0.85rem", color: isIG ? "#aaa" : t.accent,
                        fontStyle: "italic", marginTop: "2px",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        opacity: 0.8,
                      }}
                    >
                      {entry.caption}
                    </div>
                  )}
                </div>
                {isIG && <span style={{ fontSize: "1rem", flexShrink: 0 }}>📱</span>}
                {entry.customTheme && !isIG && <span title="Custom palette" style={{ fontSize: "1rem", flexShrink: 0 }}>🎨</span>}
                {entry.meta?.locked && <span title="Private entry" style={{ fontSize: "1rem", flexShrink: 0 }}>🔒</span>}
                <div style={{ color: isIG ? "#888" : t.accent, fontFamily: "'Caveat',cursive", fontSize: "1.4rem", flexShrink: 0 }}>→</div>
              </div>
            );
          })
        )}

          {/* ── Private folder card ─────────────────────────────── */}
          {lockedCount > 0 && !pinUnlocked && (
            <div
              onClick={onOpenLockedFolder}
              style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "14px 18px", marginTop: entries.length > 0 ? "18px" : 0,
                borderRadius: "10px",
                background: "white",
                border: "2px dashed #e8c878",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(6px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
            >
              <div style={{ width: "56px", height: "56px", background: "#fdf6e3", borderRadius: "50%", border: "2px solid #e8c878", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", flexShrink: 0 }}>
                🔒
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.4rem", color: "#5c3d11", fontWeight: 600 }}>
                  Private
                </div>
                <div style={{ fontSize: "0.85rem", color: "#c2842a", fontStyle: "italic" }}>
                  {lockedCount} hidden entr{lockedCount !== 1 ? "ies" : "y"} — tap to unlock
                </div>
              </div>
              <div style={{ color: "#c2842a", fontFamily: "'Caveat',cursive", fontSize: "1.4rem", flexShrink: 0 }}>→</div>
            </div>
          )}

          {lockedCount > 0 && pinUnlocked && (
            <div style={{ marginTop: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderRadius: "8px", background: "#fdf6e3", border: "1.5px solid #e8c878" }}>
              <span style={{ fontFamily: "'Caveat',cursive", color: "#8B4513", fontSize: "1.05rem" }}>🔓 Private entries unlocked for this session</span>
              <button
                onClick={onLockSession}
                style={{ background: "none", border: "1px solid #e8c878", borderRadius: "6px", color: "#8B4513", fontSize: "0.82rem", cursor: "pointer", padding: "3px 10px", fontFamily: "'Lora',serif" }}
              >
                Lock again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
