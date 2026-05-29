import { useRef, useState } from "react";
import { GF, S } from "../lib/constants.js";

// ── PIN helper — stored device-only in localStorage ──────────────────────────
const LS_KEY = "ab_private_pin";
export const pin = {
  exists: () => !!localStorage.getItem(LS_KEY),
  get:    () => localStorage.getItem(LS_KEY) || null,
  set:    (v) => localStorage.setItem(LS_KEY, String(v)),
  clear:  () => localStorage.removeItem(LS_KEY),
};

// ── Component ─────────────────────────────────────────────────────────────────
// mode:
//   "setup"        — no PIN set yet; user picks their code
//   "unlock"       — PIN exists on this device; user enters it
//   "other_device" — no PIN on this device but locked entries exist elsewhere
//
// Props:
//   onSuccess()  — correct PIN entered (unlock) or new PIN saved (setup)
//   onReset()    — user wants to reset; parent handles unlocking all entries
//   onClose()    — dismiss without doing anything
// ─────────────────────────────────────────────────────────────────────────────
export default function PinGate({ mode, onSuccess, onReset, onClose }) {
  const [digits, setDigits] = useState(["", "", ""]);
  const [error, setError]   = useState("");
  const refs = [useRef(null), useRef(null), useRef(null)];

  function handleDigit(i, raw) {
    const d = raw.replace(/\D/, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError("");
    if (d && i < 2) refs[i + 1].current?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === "Enter") submit();
  }

  function submit() {
    const code = digits.join("");
    if (code.length < 3) { setError("Enter all 3 digits."); return; }

    if (mode === "setup") {
      pin.set(code);
      onSuccess();
    } else {
      if (code === pin.get()) {
        onSuccess();
      } else {
        setError("Wrong PIN — try again.");
        setDigits(["", "", ""]);
        refs[0].current?.focus();
      }
    }
  }

  const ACCENT = "#8B4513";
  const GOLD   = "#c2842a";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(30,10,0,0.62)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{GF}</style>
      <div style={{ background: "#fffdf5", borderRadius: "18px", padding: "32px 28px", maxWidth: "340px", width: "100%", boxShadow: "0 18px 55px rgba(74,34,8,0.35)", border: "2px solid #e8c878", textAlign: "center" }}>

        <div style={{ fontSize: "2.6rem", marginBottom: "6px" }}>🔒</div>
        <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.8rem", color: ACCENT, fontWeight: 700, marginBottom: "4px" }}>
          {mode === "setup"        ? "Set your private PIN"  :
           mode === "unlock"       ? "Private folder"        :
                                     "Locked on another device"}
        </div>

        {mode === "other_device" ? (
          <>
            <p style={{ color: GOLD, fontSize: "0.95rem", lineHeight: 1.6, margin: "12px 0 24px" }}>
              These entries are private and can only be opened on the device where the PIN was first set up.
            </p>
            <button onClick={onClose} style={S.btn("#e8c878", ACCENT)}>← Go back</button>
          </>
        ) : (
          <>
            <p style={{ color: GOLD, fontSize: "0.9rem", fontStyle: "italic", margin: "8px 0 22px" }}>
              {mode === "setup"
                ? "Choose a 3-digit PIN — only you will know it."
                : "Enter your 3-digit PIN to unlock."}
            </p>

            {/* Digit inputs */}
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "16px" }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={refs[i]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  autoFocus={i === 0}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  style={{
                    width: "54px", height: "62px", textAlign: "center",
                    fontSize: "1.9rem", fontFamily: "'Caveat',cursive",
                    borderRadius: "10px",
                    border: "2px solid " + (error ? "#e53e3e" : "#e8c878"),
                    background: "#fdf6e3", color: ACCENT, outline: "none",
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ color: "#e53e3e", fontSize: "0.85rem", marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={onClose} style={S.btn("rgba(139,69,19,0.1)", ACCENT)}>Cancel</button>
              <button onClick={submit}  style={S.btn(ACCENT, "white")}>
                {mode === "setup" ? "Save PIN" : "Unlock ✨"}
              </button>
            </div>

            {mode === "unlock" && (
              <button
                onClick={onReset}
                style={{ background: "none", border: "none", color: "#b8954a", fontSize: "0.82rem", cursor: "pointer", marginTop: "16px", textDecoration: "underline", fontFamily: "'Lora',serif" }}
              >
                Forgot PIN? Reset &amp; unlock all private entries
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
