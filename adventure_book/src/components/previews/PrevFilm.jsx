export default function PrevFilm() {
  return (
    <div style={{ background: "#111", borderRadius: "8px", padding: "8px", border: "2px solid #f5c518", height: "100%", display: "flex", gap: "6px" }}>
      <div style={{ width: "38%", background: "linear-gradient(180deg,#555,#222)", borderRadius: "4px", display: "flex", alignItems: "flex-end", padding: "4px" }}>
        <div style={{ height: "4px", width: "80%", background: "#f5c518", borderRadius: "2px" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
        <div style={{ height: "7px", background: "#f5c518", borderRadius: "3px", width: "85%" }} />
        <div style={{ fontSize: "8px", color: "#f5c518" }}>★★★★☆</div>
        {[90, 75, 85].map((w, i) => (
          <div key={i} style={{ height: "4px", width: w + "%", background: "#555", borderRadius: "2px" }} />
        ))}
      </div>
    </div>
  );
}
