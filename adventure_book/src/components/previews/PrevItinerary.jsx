export default function PrevItinerary({ t }) {
  return (
    <div style={{ background: t.paper, borderRadius: "8px", padding: "8px", border: "2px solid " + t.border, height: "100%", display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ height: "10px", background: t.accent, borderRadius: "4px", width: "60%" }} />
      {["9:00", "11:30", "14:00", "17:00"].map((time, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ fontSize: "6px", color: t.accent, fontWeight: 700, width: "22px", flexShrink: 0 }}>{time}</div>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
          <div style={{ height: "4px", flex: 1, background: t.border, borderRadius: "2px" }} />
        </div>
      ))}
    </div>
  );
}
