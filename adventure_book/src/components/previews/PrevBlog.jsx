export default function PrevBlog({ t }) {
  return (
    <div style={{ background: "white", borderRadius: "8px", padding: "8px", border: "1.5px solid #eee", height: "100%", display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ height: "36px", background: "linear-gradient(135deg," + t.accent + "," + t.header + ")", borderRadius: "4px" }} />
      <div style={{ height: "9px", background: "#222", borderRadius: "3px", width: "80%" }} />
      <div style={{ height: "6px", background: "#888", borderRadius: "3px", width: "50%" }} />
      {[95, 85, 100, 70, 90].map((w, i) => (
        <div key={i} style={{ height: "4px", width: w + "%", background: "#ddd", borderRadius: "2px" }} />
      ))}
    </div>
  );
}
