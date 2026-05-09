export default function PrevFairytale() {
  return (
    <div style={{ background: "#fff8f0", borderRadius: "8px", padding: "8px", border: "2px solid #d4956a", height: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ textAlign: "center", fontSize: "8px", color: "#8B4513", fontFamily: "serif", fontStyle: "italic", fontWeight: 700 }}>✨ Once upon a time… ✨</div>
      <div style={{ display: "flex", gap: "5px", alignItems: "flex-start" }}>
        <div style={{ fontSize: "22px", lineHeight: 1, color: "#c2842a", fontFamily: "serif", fontWeight: 700 }}>O</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px", marginTop: "2px" }}>
          {[90, 80, 95, 70, 85].map((w, i) => (
            <div key={i} style={{ height: "4px", width: w + "%", background: "#d4956a", borderRadius: "2px", opacity: 0.5 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
