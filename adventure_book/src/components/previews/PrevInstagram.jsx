export default function PrevInstagram() {
  return (
    <div style={{ background: "#000", borderRadius: "8px", border: "1.5px solid #333", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "5px 7px", display: "flex", alignItems: "center", gap: "5px", borderBottom: "1px solid #222" }}>
        <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }} />
        <div style={{ height: "5px", width: "40px", background: "#333", borderRadius: "2px" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", flex: 1 }}>
        {["#3a3a3a", "#2a2a2a", "#3a3a3a", "#2a2a2a", "#3a3a3a", "#2a2a2a"].map((bg, i) => (
          <div key={i} style={{ background: bg }} />
        ))}
      </div>
    </div>
  );
}
