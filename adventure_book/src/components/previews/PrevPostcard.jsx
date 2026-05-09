export default function PrevPostcard() {
  return (
    <div style={{ background: "#fffdf0", borderRadius: "8px", padding: "8px", border: "2px solid #d4a855", height: "100%", display: "flex", gap: "6px" }}>
      <div style={{ flex: 1, borderRight: "1px dashed #d4a855", paddingRight: "6px", display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
        {[90, 75, 85, 60, 80].map((w, i) => (
          <div key={i} style={{ height: "5px", width: w + "%", background: "#b8954a", borderRadius: "3px", opacity: 0.4 }} />
        ))}
      </div>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
        <div style={{ width: "28px", height: "34px", background: "#e05c5c", borderRadius: "2px", border: "2px solid #c04040", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>🌸</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px", justifyContent: "flex-end" }}>
          {[80, 65, 75].map((w, i) => (
            <div key={i} style={{ height: "4px", width: w + "%", background: "#b8954a", borderRadius: "2px", opacity: 0.35 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
