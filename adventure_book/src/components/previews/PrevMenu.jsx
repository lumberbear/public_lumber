export default function PrevMenu() {
  return (
    <div style={{ background: "#1a0a00", borderRadius: "8px", padding: "8px", border: "2px solid #c8a050", height: "100%", display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "7px", color: "#c8a050", fontFamily: "serif", letterSpacing: "2px", fontWeight: 700 }}>✦ MENU ✦</div>
      </div>
      {["STARTERS", "MAINS", "DESSERTS"].map((s, i) => (
        <div key={i} style={{ borderTop: "1px solid #c8a05044", paddingTop: "3px" }}>
          <div style={{ fontSize: "5px", color: "#c8a050", letterSpacing: "1px", marginBottom: "2px" }}>{s}</div>
          <div style={{ height: "4px", background: "#c8a05066", borderRadius: "2px", width: "80%" }} />
        </div>
      ))}
    </div>
  );
}
