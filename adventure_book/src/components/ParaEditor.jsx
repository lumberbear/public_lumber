import { useEffect, useRef } from "react";

// Backspace at column 0 merges with previous paragraph; Enter splits at the cursor.
export default function ParaEditor({ value, onChange, onSplit, onMerge, t, idx, placeholder }) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  function kd(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      const { selectionStart: s, value: v } = e.target;
      e.preventDefault();
      onSplit(v.slice(0, s), v.slice(s));
    } else if (e.key === "Backspace" && e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
      e.preventDefault();
      onMerge();
    }
  }

  const ph = placeholder ||
    "Paragraph " + (idx + 1) + (idx === 0 ? " — start writing here…" : " (Backspace at start to merge)…");

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={kd}
      placeholder={ph}
      style={{
        width: "100%", border: "none", outline: "none", background: "transparent",
        color: t.text, fontFamily: "'Lora',serif", fontSize: "1.05rem",
        lineHeight: "1.95", resize: "none", overflow: "hidden",
        padding: 0, margin: "0 0 0.5em 0", display: "block", minHeight: "1.95em",
      }}
    />
  );
}
