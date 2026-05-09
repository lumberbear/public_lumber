export default function PrevScrapbook({ t }) {
  return (
    <div style={{ background: t.paper, borderRadius: "8px", padding: "10px", border: "2px solid " + t.border, height: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ background: "linear-gradient(135deg," + t.header + "," + t.accent + ")", borderRadius: "5px", height: "18px" }} />
      <div style={{ display: "flex", gap: "6px", flex: 1 }}>
        <div style={{ width: "38%", background: t.border, borderRadius: "5px", transform: "rotate(-2deg)" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
          {[70, 100, 85, 60].map((w, i) => (
            <div key={i} style={{ height: "6px", width: w + "%", background: t.border, borderRadius: "3px", opacity: 0.6 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
