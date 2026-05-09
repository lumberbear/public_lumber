export default function PalettePreview({ theme }) {
  return (
    <div style={{ display: "flex", gap: "5px", marginTop: "6px" }}>
      {["bg", "paper", "accent", "text", "border", "header"].map((k) => (
        <div
          key={k}
          title={k}
          style={{
            width: "22px", height: "22px", borderRadius: "50%",
            background: theme[k], border: "2px solid rgba(0,0,0,0.15)",
          }}
        />
      ))}
    </div>
  );
}
