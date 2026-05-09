export default function PrevNewspaper() {
  return (
    <div style={{ background: "#f5f0e0", borderRadius: "8px", padding: "8px", border: "2px solid #ccc", height: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #333", paddingBottom: "3px" }}>
        <div style={{ fontSize: "8px", fontWeight: 700, color: "#333", fontFamily: "serif", letterSpacing: "1px" }}>THE ADVENTURE GAZETTE</div>
      </div>
      <div style={{ height: "8px", background: "#333", borderRadius: "2px", width: "90%", margin: "0 auto" }} />
      <div style={{ display: "flex", gap: "4px", flex: 1 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: "4px", background: "#888", borderRadius: "2px", opacity: 0.4, width: 70 + Math.sin(i) * 20 + "%" }} />
          ))}
        </div>
        <div style={{ width: "35%", display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ flex: 1, background: "#ccc", borderRadius: "3px" }} />
          {[0, 1].map((i) => (
            <div key={i} style={{ height: "4px", background: "#888", borderRadius: "2px", opacity: 0.4 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
