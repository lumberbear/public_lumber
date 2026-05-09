export default function PrevReceipt() {
  return (
    <div style={{ background: "#fffef5", borderRadius: "4px", padding: "8px", border: "1.5px solid #ddd", height: "100%", display: "flex", flexDirection: "column", gap: "3px", fontFamily: "monospace" }}>
      <div style={{ textAlign: "center", fontSize: "7px", color: "#333", fontWeight: 700, letterSpacing: "1px", borderBottom: "1px dashed #aaa", paddingBottom: "3px" }}>*** RECEIPT ***</div>
      {["Morning walk", "Brunch x2", "Museum", "Gelato"].map((s, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ height: "4px", width: "55%", background: "#bbb", borderRadius: "2px" }} />
          <div style={{ height: "4px", width: "18%", background: "#bbb", borderRadius: "2px" }} />
        </div>
      ))}
      <div style={{ borderTop: "1px dashed #aaa", marginTop: "2px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ height: "5px", width: "30%", background: "#888", borderRadius: "2px" }} />
        <div style={{ height: "5px", width: "22%", background: "#888", borderRadius: "2px" }} />
      </div>
    </div>
  );
}
