import { useMemo, useRef, useState } from "react";
import { THEMES, STICKERS, PROFILES, GF, S } from "../lib/constants.js";
import { normPhoto } from "../lib/helpers.js";
import { api } from "../lib/api.js";
import ProfilePhotoUploader from "./ProfilePhotoUploader.jsx";
import AvatarUploader from "./AvatarUploader.jsx";
import PalettePreview from "./PalettePreview.jsx";
import ParaEditor from "./ParaEditor.jsx";
import DropZone from "./DropZone.jsx";
import EditPhoto from "./EditPhoto.jsx";
import PhotoCommentEditor from "./PhotoCommentEditor.jsx";

export default function EditorPage({
  form, setForm, onSubmit, onCancel,
  fileRef, analyzing, setAnalyzing,
  avatars, onAvatarChange,
}) {
  const t = form.customTheme || THEMES[form.theme] || THEMES["Golden Hour"];
  const isIG = form.template === "instagram";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dragIdx = useRef(null);
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const paragraphs = useMemo(() => {
    const parts = form.journal.split(/\n\n+/);
    return parts.length > 0 ? parts : [""];
  }, [form.journal]);
  const numParas = paragraphs.length;

  function setParagraphs(paras) { f("journal", paras.join("\n\n")); }
  function updatePara(i, val) {
    const n = [...paragraphs];
    n[i] = val;
    setParagraphs(n);
  }
  function splitPara(i, before, after) {
    const n = [...paragraphs];
    n.splice(i, 1, before, after);
    setForm((p) => ({
      ...p,
      journal: n.join("\n\n"),
      photos: p.photos.map((ph) => ({
        ...ph,
        para: (ph.para || 0) > i ? (ph.para || 0) + 1 : (ph.para || 0),
      })),
    }));
  }
  function mergePara(i) {
    if (i === 0) return;
    const n = [...paragraphs];
    n.splice(i - 1, 2, n[i - 1] + n[i]);
    setForm((p) => ({
      ...p,
      journal: n.join("\n\n"),
      photos: p.photos.map((ph) => {
        const para = ph.para || 0;
        return { ...ph, para: para === i ? i - 1 : para > i ? para - 1 : para };
      }),
    }));
  }
  function setPhotoAttr(idx, key, val) {
    setForm((p) => {
      const photos = [...p.photos];
      photos[idx] = { ...photos[idx], [key]: val };
      return { ...p, photos };
    });
  }
  function replacePhoto(idx, uploaded) {
    // uploaded = { id, src } from api.uploadOnePhoto. Old photo file is orphaned (cleanup later).
    setForm((p) => {
      const photos = [...p.photos];
      photos[idx] = { ...photos[idx], id: uploaded.id, src: uploaded.src };
      return { ...p, photos };
    });
  }
  function removePhoto(idx) {
    setForm((p) => ({ ...p, photos: p.photos.filter((_, i) => i !== idx) }));
  }
  function addComment(pidx, comment) {
    setForm((p) => {
      const photos = [...p.photos];
      photos[pidx] = { ...photos[pidx], comments: [...(photos[pidx].comments || []), comment] };
      return { ...p, photos };
    });
  }
  function removeComment(pidx, cidx) {
    setForm((p) => {
      const photos = [...p.photos];
      photos[pidx] = {
        ...photos[pidx],
        comments: (photos[pidx].comments || []).filter((_, i) => i !== cidx),
      };
      return { ...p, photos };
    });
  }

  const normPhotos = form.photos.map((p, i) => ({ ...normPhoto(p, i), _idx: i }));
  function photosAt(i) {
    return normPhotos.filter((ph) => {
      const para = ph.para !== undefined ? ph.para : ph._idx;
      return i < numParas ? para === i : para >= numParas;
    });
  }
  function onDrop(paraIdx) {
    if (dragIdx.current === null) return;
    setPhotoAttr(dragIdx.current, "para", paraIdx);
    dragIdx.current = null;
  }

  // Upload photos to Supabase Storage, then push them into form.photos.
  // Palette analysis is disabled in the static GitHub Pages build.
  async function handlePhotos(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = "";

    const isFirst = form.photos.length === 0;
    const curParas = form.journal.split(/\n\n+/).filter(Boolean).length || 1;

    const uploaded = await api.uploadPhotos(files);
    const newPhotos = uploaded.map((u, i) => ({
      id: u.id,
      src: u.src,
      align: i % 2 === 0 ? "left" : "right",
      para: curParas,
      comments: [],
    }));
    setForm((p) => ({ ...p, photos: [...p.photos, ...newPhotos] }));

    if (isFirst && uploaded.length > 0 && !isIG) {
      setAnalyzing(true);
      try {
        const palette = await api.generatePalette(uploaded[0].dataUrl);
        if (palette) setForm((p) => ({ ...p, customTheme: palette }));
      } finally {
        setAnalyzing(false);
      }
    }
  }

  // Wire EditorPage's own file input through handlePhotos. App.jsx forwards its ref.
  // (The same fileRef is used for the "+ Add Photos" button in settings AND the empty-state CTA.)
  // We set onChange directly on the input below.

  function renderBody() {
    const els = [];
    let photoCount = 0;
    for (let i = 0; i <= numParas; i++) {
      els.push(<DropZone key={"dz" + i} paraIdx={i} onDrop={onDrop} t={t} />);
      photosAt(i).forEach((ph) => {
        photoCount++;
        const pc = photoCount;
        const pidx = ph._idx;
        els.push(
          <div key={"phwrap" + pidx}>
            <EditPhoto
              photo={ph}
              t={t}
              numParas={numParas}
              badge={isIG ? pc : null}
              onAttr={(k, v) => setPhotoAttr(pidx, k, v)}
              onRemove={() => removePhoto(pidx)}
              onReplace={(uploaded) => replacePhoto(pidx, uploaded)}
              onDragStart={() => { dragIdx.current = pidx; }}
            />
            {isIG && (
              <PhotoCommentEditor
                comments={form.photos[pidx]?.comments || []}
                avatars={avatars}
                onAdd={(c) => addComment(pidx, c)}
                onRemove={(ci) => removeComment(pidx, ci)}
              />
            )}
          </div>
        );
      });
      if (i < numParas) {
        if (isIG) {
          els.push(
            <div key={"iglbl" + i} style={{ fontFamily: "'Caveat',cursive", color: t.accent, fontSize: "0.85rem", opacity: 0.8, marginBottom: "2px" }}>
              {"✏️ Caption for Post " + (i + 1)}
            </div>
          );
        }
        els.push(
          <ParaEditor
            key={"para" + i}
            value={paragraphs[i]}
            onChange={(v) => updatePara(i, v)}
            onSplit={(b, a) => splitPara(i, b, a)}
            onMerge={() => mergePara(i)}
            t={t}
            idx={i}
            placeholder={isIG ? "Write caption for Post " + (i + 1) + "…" : undefined}
          />
        );
      }
    }
    els.push(<div key="cf" style={{ clear: "both" }} />);
    return els;
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Lora',serif" }}>
      <style>{GF + " textarea{resize:none} @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"}</style>
      <div style={{ position: "sticky", top: 0, zIndex: 200, background: "linear-gradient(135deg," + t.header + "," + t.accent + ")", padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 14px " + t.border + "88" }}>
        <button onClick={onCancel} style={S.btn("rgba(255,255,255,0.15)", "white")}>✕ Cancel</button>
        <button onClick={() => setSettingsOpen((s) => !s)} style={S.btn("rgba(255,255,255,0.18)", "white", { display: "flex", alignItems: "center", gap: "6px" })}>
          ⚙️ Settings {settingsOpen ? "▲" : "▼"}
        </button>
        <button onClick={onSubmit} style={S.btn("#fde68a", "#5c3d11", { fontWeight: 700 })}>💾 Save</button>
      </div>
      {settingsOpen && (
        <div style={{ background: t.header, padding: "16px 24px", borderBottom: "3px solid " + t.border + "55", display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "flex-start" }}>
          {!form.customTheme && !isIG && (
            <div>
              <label style={{ ...S.lbl(t), color: "rgba(255,255,255,0.85)" }}>Theme</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {Object.keys(THEMES).map((th) => (
                  <button
                    key={th}
                    onClick={() => f("theme", th)}
                    style={{
                      padding: "4px 10px", borderRadius: "14px", border: "none",
                      background: form.theme === th ? "white" : "rgba(255,255,255,0.2)",
                      color: form.theme === th ? t.header : "white",
                      cursor: "pointer", fontFamily: "'Caveat',cursive",
                      fontSize: "0.9rem", fontWeight: form.theme === th ? 700 : 400,
                    }}
                  >
                    {th}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label style={{ ...S.lbl(t), color: "rgba(255,255,255,0.85)" }}>Stickers</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {STICKERS.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      stickers: p.stickers.includes(s)
                        ? p.stickers.filter((x) => x !== s)
                        : [...p.stickers, s],
                    }))
                  }
                  style={{
                    fontSize: "1.2rem", padding: "3px 6px", borderRadius: "6px",
                    border: "1.5px solid " + (form.stickers.includes(s) ? "white" : "rgba(255,255,255,0.3)"),
                    background: form.stickers.includes(s) ? "rgba(255,255,255,0.28)" : "transparent",
                    cursor: "pointer",
                    transform: form.stickers.includes(s) ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.1s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ ...S.lbl(t), color: "rgba(255,255,255,0.85)" }}>Photos</label>
            <button
              onClick={() => fileRef.current.click()}
              style={{ padding: "7px 16px", borderRadius: "8px", border: "2px dashed rgba(255,255,255,0.5)", background: "transparent", color: "white", cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "1rem" }}
            >
              + Add Photos
            </button>
            {analyzing && (
              <span style={{ marginLeft: "10px", color: "white", fontFamily: "'Caveat',cursive", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>🎨</span>
                Generating palette…
              </span>
            )}
          </div>
          {isIG && (
            <div>
              <label style={{ ...S.lbl(t), color: "rgba(255,255,255,0.85)" }}>Commenter Avatars</label>
              <div style={{ display: "flex", gap: "20px" }}>
                {PROFILES.map((p) => (
                  <AvatarUploader
                    key={p}
                    name={p}
                    src={avatars[p]}
                    onChange={(id, src) => onAvatarChange(p, id, src)}
                  />
                ))}
              </div>
            </div>
          )}
          {form.customTheme && (
            <div>
              <label style={{ ...S.lbl(t), color: "rgba(255,255,255,0.85)" }}>Custom Palette 🎨</label>
              <PalettePreview theme={form.customTheme} />
              <button
                onClick={() => f("customTheme", null)}
                style={{ marginTop: "6px", fontSize: "0.82rem", padding: "3px 8px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "white", cursor: "pointer", fontFamily: "'Caveat',cursive" }}
              >
                ✕ Remove
              </button>
            </div>
          )}
        </div>
      )}
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "30px 20px" }}>
        <div style={{ ...S.card(t), marginBottom: "24px" }}>
          {isIG && (
            <ProfilePhotoUploader
              src={form.profilePhoto}
              onChange={(u) => setForm((p) => ({ ...p, profilePhoto: u.src, profilePhotoId: u.id }))}
              t={t}
            />
          )}
          <input
            value={form.title}
            onChange={(e) => f("title", e.target.value)}
            placeholder={isIG ? "Profile username…" : "Adventure title…"}
            style={{
              fontFamily: "'Caveat',cursive", fontSize: "2.6rem", fontWeight: 700,
              color: t.text, background: "transparent", border: "none", outline: "none",
              width: "100%", padding: 0, borderBottom: "2px dashed " + t.border,
            }}
          />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginTop: "10px" }}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => f("date", e.target.value)}
              style={{
                fontFamily: "'Caveat',cursive", fontSize: "1.05rem",
                color: t.accent, background: t.bg,
                border: "1.5px solid " + t.border, borderRadius: "16px",
                padding: "4px 12px", outline: "none",
              }}
            />
            <input
              value={form.caption}
              onChange={(e) => f("caption", e.target.value)}
              placeholder={isIG ? "Bio…" : "A short caption…"}
              style={{
                flex: 1, fontFamily: "'Lora',serif", fontSize: "1rem",
                fontStyle: "italic", color: t.accent, background: "transparent",
                border: "none", borderBottom: "1px dashed " + t.border,
                outline: "none", padding: "4px 0", minWidth: "160px",
              }}
            />
          </div>
          {form.stickers?.length > 0 && (
            <div style={{ fontSize: "1.6rem", letterSpacing: "5px", marginTop: "10px" }}>{form.stickers.join(" ")}</div>
          )}
          {form.customTheme && (
            <div style={{ fontSize: "0.8rem", color: t.accent, opacity: 0.65, marginTop: "6px" }}>🎨 Palette from your photos</div>
          )}
        </div>
        <div style={S.card(t)}>
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.35rem", color: t.accent, marginBottom: "14px", fontWeight: 600, borderBottom: "1px solid " + t.border, paddingBottom: "10px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <span>{isIG ? "📱 Posts & Captions" : "📝 Journal Entry"}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 400, opacity: 0.65, fontFamily: "'Lora',serif" }}>
              {isIG ? "One photo + caption = one post" : "Enter = new paragraph · drag photos to drop zones"}
            </span>
          </div>
          {form.photos.length === 0 && !analyzing && (
            <div
              onClick={() => fileRef.current.click()}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 18px", borderRadius: "10px", border: "2px dashed " + t.border, background: t.bg, cursor: "pointer", marginBottom: "14px", opacity: 0.75 }}
            >
              <span style={{ fontSize: "1.4rem" }}>📷</span>
              <span style={{ fontFamily: "'Caveat',cursive", fontSize: "1.1rem", color: t.accent }}>
                {isIG ? "Click to add your first post photo ✨" : "Click to add photos — your first photo generates a custom palette ✨"}
              </span>
            </div>
          )}
          {!isIG && analyzing && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: t.bg, borderRadius: "8px", marginBottom: "14px", border: "2px solid " + t.border }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>🎨</span>
              <span style={{ fontFamily: "'Caveat',cursive", color: t.accent }}>Generating custom palette from your photo…</span>
            </div>
          )}
          <div style={{ color: t.text, fontSize: "1.05rem", lineHeight: "1.95" }}>{renderBody()}</div>
          {form.photos.length > 0 && (
            <div style={{ marginTop: "12px", textAlign: "center" }}>
              <button
                onClick={() => fileRef.current.click()}
                style={{ padding: "7px 18px", borderRadius: "8px", border: "2px dashed " + t.border, background: t.bg, color: t.accent, cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: "0.95rem" }}
              >
                {isIG ? "+ Add Another Post" : "+ Add More Photos"}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onSubmit}
          style={{
            display: "block", width: "100%", marginTop: "24px",
            padding: "15px", borderRadius: "10px", border: "none",
            background: t.accent, color: "white",
            fontFamily: "'Caveat',cursive", fontSize: "1.5rem", fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 18px " + t.accent + "66",
          }}
        >
          💾 Save Adventure
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handlePhotos}
      />
    </div>
  );
}
