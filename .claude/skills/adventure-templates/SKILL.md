---
name: adventure-templates
description: Manage the entry templates in the Adventure Book app — list existing templates, edit their metadata or preview thumbnails, edit the full render view of "ready" templates, or scaffold a brand-new template (preview thumbnail + full render view + wiring) and then auto-commit and push to `main` so GitHub Pages deploys the change. Use this skill whenever the user says things like "list the adventure book templates", "what templates do we have", "show me the templates", "add a new template called X", "make a <something> template for the adventure book", "create a template that looks like X", "edit the postcard template", "change the description of the menu template", "rename the receipt template", "change the icon for X", "mark <template> as ready", "remove the X template", or otherwise asks about the templates in the adventure_book app. Do NOT trigger for other parts of the repo (the_dojo, supabase schema, etc.).
---

# adventure-templates

This skill helps the user manage the entry templates in the Adventure Book app. The user is **not necessarily a coder** — they describe what they want in plain English ("add a polaroid template", "make the icon for menu a fork emoji") and this skill does the file edits, then commits and pushes to `main` so GitHub Pages re-deploys.

The user does not need to know any of the file paths, component names, or React patterns below. Translate plain-English requests into the right edits.

## Where everything lives

All paths are relative to `/Users/anoo/claude/public_lumber/`.

| Thing | File |
|---|---|
| The template registry (id, label, icon, short description, ready flag) | `adventure_book/src/components/TemplatePicker.jsx` — the `TEMPLATES` array near the top |
| Preview thumbnails (the small picture shown in the picker) | `adventure_book/src/components/previews/Prev<Name>.jsx` |
| Full render view for a "ready" template | `adventure_book/src/components/<Name>View.jsx` (e.g. `NewspaperView.jsx`) — Instagram is a special case with two views: `InstagramProfile.jsx` and `InstagramPost.jsx` |
| Wiring that picks which view to render based on `entry.template` | `adventure_book/src/App.jsx` — search for `isIGEntry` / `isNewspaperEntry` and the matching `view === "entry"` render blocks. The default fallback view is `EntryView.jsx` |
| Editor-specific tweaks per template | `adventure_book/src/components/EditorPage.jsx` — `isIG` / `isNews` flags. Most templates don't need any change here |
| Shared theme colors and font helpers used inside every view | `adventure_book/src/lib/constants.js` — `THEMES`, `S` (style helpers), `GF` (Google Fonts import string) |

The currently-defined templates (as of when this skill was written; re-read the file to get current truth):

- `scrapbook`, `instagram`, `newspaper` — **ready** (have full render views)
- `postcard`, `menu`, `blogpost`, `receipt`, `itinerary`, `filmreview`, `fairytale` — placeholders only ("Coming Soon" overlay)

## How to talk to the user

- Keep questions short and visual where possible.
- Don't expose file paths or component names unless the user asks. They want to know "what templates are there", not "what's in TemplatePicker.jsx".
- When listing templates, render them as a friendly table or bulleted list with the icon, label, one-line description, and whether they're "Ready" or "Coming Soon".
- Before any commit/push, summarize the change in plain English ("Renamed the Receipt template to Itemized Memory and changed the icon from 🧾 to ✨") and confirm with the user.
- After pushing, tell the user the GitHub Action will rebuild Pages in ~1–2 minutes at `https://lumberbear.github.io/public_lumber/adventure_book/`.

## Workflows

### List templates

Read `adventure_book/src/components/TemplatePicker.jsx` and parse the `TEMPLATES` array. Show each entry as: icon, label, description, status (Ready / Coming Soon). Don't show the React preview component name unless asked.

### Edit an existing template's metadata (label, icon, description, ready flag)

Edit only the matching object in the `TEMPLATES` array in `TemplatePicker.jsx`. Use the `Edit` tool with enough surrounding context that the match is unique. Do not reformat unrelated entries.

- Renaming the label is safe and does not require changes anywhere else.
- Changing the `id` is **risky** because existing entries in Supabase reference templates by id (`entry.template === "instagram"`, etc.). If the user wants to rename, ask whether they mean change the user-facing label (safe) or the internal id (would orphan existing entries unless migrated). Default to label-only.
- Flipping `ready: false` → `ready: true` for a template that has no full render view will make the template **clickable but render as the default scrapbook view** (because `App.jsx` only special-cases `instagram` and `newspaper`). Warn the user about this and offer to scaffold a full render view (see next workflow). Don't flip `ready: true` without doing one of: (a) scaffolding a real view, (b) explicit user confirmation that the default scrapbook fallback is acceptable.

### Edit a template's preview thumbnail

Edit `adventure_book/src/components/previews/Prev<Name>.jsx`. These are small (~150×100) inline-styled React components — no real images, just colored boxes and lines that suggest the layout. When the user describes a tweak ("make the receipt look longer", "change the postcard stamp to blue"), translate into the inline `style` props.

### Edit the full render view of a ready template

The "ready" templates each have their own file:
- `scrapbook` → `EntryView.jsx` (default — used by any template without a special-case)
- `instagram` → `InstagramProfile.jsx` (the grid) + `InstagramPost.jsx` (single-post view)
- `newspaper` → `NewspaperView.jsx`

Locate the right file and make targeted edits. Re-read the file after editing if you need to verify visual structure. Keep the existing theme integration (`THEMES`, `S.card(t)`, `GF`) intact.

### Add a brand-new template (full render, end-to-end)

This is the big one. Walk through these steps **in order**:

#### Step 1 — Collect the basics from the user

Ask in plain English, batched into one or two short questions:
- A short name for it (you'll derive an `id` like `polaroid` and a label like `Polaroid`).
- An emoji icon.
- A one-line description (the italic line shown in the picker — keep under ~70 chars).
- What it should *look like* on the page when someone opens an entry — give them a few example styles to react to: "magazine spread", "polaroid stack on a corkboard", "text-message thread", "receipt", "vintage postcard", etc.

If they're vague, propose a layout and confirm before scaffolding.

#### Step 2 — Pick the id

- Lowercase, no spaces, no punctuation. Match the existing pattern: `scrapbook`, `instagram`, `newspaper`, `blogpost`, `filmreview`. Use a single concatenated word.
- Derive the **PascalCase component name** from the id by capitalizing: `polaroid` → `Polaroid`, `blogpost` → `Blogpost` (or `BlogPost` if the user explicitly prefers — match the existing `PrevBlog`/`PrevFilm` shorthand pattern only if the user asked for a shorter name; otherwise use the full PascalCase id).

#### Step 3 — Scaffold the preview thumbnail

Create `adventure_book/src/components/previews/Prev<Name>.jsx`. Model after the existing previews: a small flex/grid layout of colored divs that *suggests* the final layout. Keep dimensions friendly to the ~120px-tall card the picker uses.

The function should accept `({ t })` (theme) so it can use `t.border`, `t.paper`, `t.accent`, `t.header`. Theme-less constant colors (like `PrevPostcard` does) are also fine when the template has a strong visual identity that overrides the theme.

Minimal template — adapt heavily to match the user's description:

```jsx
export default function Prev<Name>({ t }) {
  return (
    <div style={{ background: t.paper, borderRadius: "8px", padding: "10px", border: "2px solid " + t.border, height: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* layout-suggesting blocks here — header bar, image placeholder, text-line bars, etc. */}
    </div>
  );
}
```

#### Step 4 — Scaffold the full render view

Create `adventure_book/src/components/<Name>View.jsx`. This is the page the user lands on when they open an entry using this template.

Use this skeleton as the starting point, then bend the inside layout toward the visual style the user described. **Always** preserve: the back/edit/PDF/delete header buttons, the `pdfRef` wrapping the printable area, the theme integration, and reading from `entry.title`, `entry.date`, `entry.caption`, `entry.journal`, `entry.photos`, `entry.stickers`.

```jsx
import { useRef, useState } from "react";
import { THEMES, GF, S } from "../lib/constants.js";
import { formatDate, normPhoto } from "../lib/helpers.js";
import { downloadElementAsPdf } from "../lib/pdf.js";

export default function <Name>View({ entry, onBack, onEdit, onDelete }) {
  const t = entry.customTheme || THEMES[entry.theme] || THEMES["Golden Hour"];
  const photos = (entry.photos || []).map((p, i) => normPhoto(p, i));
  const paragraphs = (entry.journal || "").split(/\n\n+/).filter(Boolean);
  const [generating, setGenerating] = useState(false);
  const pdfRef = useRef();

  async function downloadPDF() {
    setGenerating(true);
    try {
      await downloadElementAsPdf(pdfRef.current, entry.title || "adventure", { background: t.bg });
    } catch (err) {
      console.error("PDF:", err);
      alert("PDF failed: " + err.message);
    }
    setGenerating(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Lora',serif" }}>
      <style>{GF + " @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}"}</style>
      <div style={{ background: "linear-gradient(135deg," + t.header + "," + t.accent + ")", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 14px " + t.border + "88", flexWrap: "wrap", gap: "8px" }}>
        <button onClick={onBack} style={S.btn("rgba(255,255,255,0.15)", "white")}>← Contents</button>
        <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.7rem", color: "white", fontWeight: 700, textAlign: "center" }}>
          🎈 {entry.title}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onEdit} style={S.btn("rgba(255,255,255,0.15)", "white")}>✏️ Edit</button>
          <button onClick={downloadPDF} disabled={generating} style={S.btn("rgba(255,255,255,0.15)", "white", { opacity: generating ? 0.6 : 1 })}>
            {generating ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> : "⬇️"} PDF
          </button>
          <button onClick={onDelete} style={S.btn("rgba(229,62,62,0.5)", "white")}>🗑️</button>
        </div>
      </div>
      <div ref={pdfRef} style={{ maxWidth: "820px", margin: "0 auto", padding: "30px 20px", background: t.bg }}>
        {/* === the template-specific body goes here === */}
        {/* Available data: entry.title, entry.date (use formatDate(entry.date)), entry.caption, entry.stickers, paragraphs[], photos[] (each has .src, .caption, .align: "left"|"right"|"full", .para) */}
      </div>
    </div>
  );
}
```

For inspiration on how to use `photos[]` with `.align` and `.para`, look at `EntryView.jsx`'s `renderJournal` (paragraph-anchored floats) or `NewspaperView.jsx`'s `PhotoFigure` (column-aware figures). Copy whichever fits the user's vision and adapt.

#### Step 5 — Register the template

In `adventure_book/src/components/TemplatePicker.jsx`:
1. Add an `import Prev<Name> from "./previews/Prev<Name>.jsx";` next to the others.
2. Add an entry to the `TEMPLATES` array — copy the existing format exactly, set `ready: true`:
   ```jsx
   { id: "<id>", label: "<Label>", icon: "<emoji>", desc: "<one-liner>", ready: true, Prev: Prev<Name> },
   ```

#### Step 6 — Wire the new view into the app

In `adventure_book/src/App.jsx`:

1. Add the import at the top alongside the others:
   ```jsx
   import <Name>View from "./components/<Name>View.jsx";
   ```

2. Find the line `const isNewspaperEntry = current && current.template === "newspaper";` and add a sibling below it:
   ```jsx
   const is<Name>Entry = current && current.template === "<id>";
   ```

3. Find the existing render blocks like:
   ```jsx
   {view === "entry" && isNewspaperEntry && current && (
     <NewspaperView entry={current} onBack={...} onEdit={...} onDelete={...} />
   )}
   ```
   Add a matching block for the new template right after it.

4. **Important — keep the default fallback exclusive.** Find the render block that renders `EntryView` as the default (the one without an `isIGEntry`/`isNewspaperEntry` guard, near the bottom of the entry-view section). It uses a condition like `view === "entry" && !isIGEntry && !isNewspaperEntry`. Add `&& !is<Name>Entry` to that guard so the default scrapbook view doesn't also render alongside your new view.

#### Step 7 — Editor (usually skip)

`EditorPage.jsx` only needs changes if the new template has its own special edit-form behavior (Instagram has profile-style avatar/handle fields, Newspaper has a headline meta field). For most new templates, the existing editor is fine and no change is needed. **Default to skipping this step** unless the user explicitly asks for custom edit fields.

#### Step 8 — Sanity check before committing

Re-read the files you created/modified to confirm:
- The `TEMPLATES` array still parses (commas, brackets balanced).
- The new view's JSX is balanced.
- All imports resolve to files you actually created.
- `App.jsx`'s default-fallback guard now excludes your new template id.

### Remove a template

Reverse of "add":
1. Remove the entry from the `TEMPLATES` array.
2. Remove the import for the preview component.
3. Delete `Prev<Name>.jsx` (and `<Name>View.jsx` if it was a ready template).
4. Remove the wiring from `App.jsx` (the `isXEntry` flag, the render block, and the `!isXEntry` clause on the default guard).

Warn the user that any existing entries saved with this template id will now fall back to the default scrapbook view.

## Always — commit and push to main

After any successful edit (and after re-reading to sanity-check), commit and push automatically. The user does not need to ask each time — they already opted in to auto-push.

From `/Users/anoo/claude/public_lumber/`:

1. `git status` to confirm only the expected files changed.
2. `git add <specific paths>` — **do not** use `git add -A` or `git add .` (avoid pulling in stray edits). Add only the files this skill touched.
3. `git commit -m "<message>"` using a short, plain-English message that describes the change from the user's perspective. Examples:
   - `Add Polaroid template to Adventure Book`
   - `Rename "Receipt" template to "Itemized Memory"`
   - `Make Postcard template ready and add full render view`
   - `Change Menu template icon to 🍴`

   Use the multi-line HEREDOC form so the Co-Authored-By trailer is preserved:
   ```sh
   git commit -m "$(cat <<'EOF'
   Add Polaroid template to Adventure Book

   Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
   EOF
   )"
   ```

4. `git push origin main`.

5. On success, tell the user something like: "Pushed to main — GitHub Pages will rebuild in about a minute. You'll see it live at https://lumberbear.github.io/public_lumber/adventure_book/."

### If the push fails

The most common cause right now is the SSH/account mismatch noted when this skill was created — the local SSH identity may not have push access to `lumberbear/public_lumber`. If `git push` returns something like `Permission to lumberbear/public_lumber.git denied to <username>`, do **not** try to force-push or rewrite history. Instead, tell the user in plain English:

> The change is saved and committed on your laptop, but I couldn't push it to GitHub because the SSH key on this machine doesn't have push access to `lumberbear/public_lumber`. Once you sort that out (either grant your current GitHub account access, or switch to an SSH key for the `lumberbear` account), just ask me to "push the templates change" and I'll retry.

Leave the commit in place — do not reset it. The user can push later once auth is sorted.

## Never

- Never change a template's `id` without explicit confirmation — it orphans existing entries.
- Never set `ready: true` for a template without either scaffolding a full view or getting explicit user confirmation that the default scrapbook view is fine.
- Never use `git add -A` / `git add .` / `git commit -a` here — too easy to pull in unrelated working-tree changes.
- Never force-push or rewrite history on `main`.
- Never edit files outside `adventure_book/src/components/` and `adventure_book/src/App.jsx` for template work, unless the user explicitly asks for editor-page changes (`EditorPage.jsx`).
