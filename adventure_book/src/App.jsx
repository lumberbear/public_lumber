import { useEffect, useRef, useState } from "react";
import { GF, PROFILES } from "./lib/constants.js";
import { normPhoto } from "./lib/helpers.js";
import { api } from "./lib/api.js";
import { authRedirectUrl, supabase } from "./lib/supabaseClient.js";
import Cover from "./components/Cover.jsx";
import Contents from "./components/Contents.jsx";
import TemplatePicker from "./components/TemplatePicker.jsx";
import EditorPage from "./components/EditorPage.jsx";
import EntryView from "./components/EntryView.jsx";
import InstagramProfile from "./components/InstagramProfile.jsx";
import InstagramPost from "./components/InstagramPost.jsx";

function emptyForm(template) {
  return {
    title: "",
    date: "",
    caption: "",
    journal: "",
    photos: [],
    stickers: [],
    theme: "Golden Hour",
    customTheme: null,
    template: template || "scrapbook",
    profilePhoto: null,
    profilePhotoId: null,
  };
}

function invitationCodeFromUrl() {
  try {
    return new URL(window.location.href).searchParams.get("invite") || "";
  } catch {
    return "";
  }
}

function removeInvitationCodeFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("invite")) {
    return;
  }
  url.searchParams.delete("invite");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

function AuthScreen({ mode, error, busy, onMode, onSubmit }) {
  const isRegister = mode === "register";
  return (
    <div style={screenBg("#6ab4d8", "#fdf6e3")}>
      <style>{GF}</style>
      <form onSubmit={onSubmit} style={panelStyle}>
        <h1 style={authTitle}>{isRegister ? "Create your account" : "Adventure Book"}</h1>
        <p style={authCopy}>{isRegister ? "Register to start a shared book." : "Sign in to open your shared book."}</p>
        {error && <p style={errorStyle}>{error}</p>}
        <label style={fieldStyle}>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={6}
            required
            style={inputStyle}
          />
        </label>
        <button type="submit" disabled={busy} style={primaryButton}>
          {busy ? "Working..." : isRegister ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => onMode(isRegister ? "sign-in" : "register")}
          style={linkButton}
        >
          {isRegister ? "Already have an account? Sign in." : "New here? Register."}
        </button>
      </form>
    </div>
  );
}

function BookSetup({ error, busy, inviteCode, setInviteCode, onCreate, onJoin, onSignOut }) {
  return (
    <div style={screenBg("#7a4520", "#220e02")}>
      <style>{GF}</style>
      <div style={panelStyle}>
        <h1 style={authTitle}>Adventure Book</h1>
        <p style={authCopy}>Create a shared book or join one from an invite.</p>
        {error && <p style={errorStyle}>{error}</p>}
        <button type="button" disabled={busy} onClick={onCreate} style={primaryButton}>
          {busy ? "Working..." : "Create shared book"}
        </button>
        <form onSubmit={onJoin} style={{ display: "grid", gap: "10px", marginTop: "18px" }}>
          <label style={fieldStyle}>
            <span>Invite code</span>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              style={inputStyle}
              placeholder="Paste invite code"
            />
          </label>
          <button type="submit" disabled={busy} style={secondaryButton}>
            Join book
          </button>
        </form>
        <button type="button" onClick={onSignOut} style={linkButton}>Sign out</button>
      </div>
    </div>
  );
}

function AccountBar({ user, activeBook, books, inviteUrl, onInvite, onSignOut, onSwitchBook }) {
  return (
    <div style={accountBarStyle}>
      {books.length > 1 ? (
        <select
          value={activeBook?.id || ""}
          onChange={(event) => onSwitchBook(event.target.value)}
          style={accountSelectStyle}
          aria-label="Adventure book"
        >
          {books.map((book) => (
            <option key={book.id} value={book.id}>{book.title}</option>
          ))}
        </select>
      ) : (
        <span style={accountBookStyle}>{activeBook?.title || "Adventure Book"}</span>
      )}
      <span style={accountEmailStyle}>{user.email}</span>
      <button type="button" onClick={onInvite} style={accountButtonStyle}>Invite</button>
      <button type="button" onClick={onSignOut} style={accountButtonStyle}>Sign out</button>
      {inviteUrl && (
        <input
          readOnly
          value={inviteUrl}
          onFocus={(event) => event.target.select()}
          style={inviteInputStyle}
          aria-label="Invite link"
        />
      )}
    </div>
  );
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("sign-in");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [inviteCode, setInviteCode] = useState(invitationCodeFromUrl);
  const [inviteUrl, setInviteUrl] = useState("");
  const [view, setView] = useState("cover");
  const [entries, setEntries] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [avatars, setAvatars] = useState({ Ollythebigbear: null, Lillythebabyelephant: null });
  const [postIdx, setPostIdx] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(error.message);
      setUser(data?.session?.user || null);
      setAuthReady(true);
    });

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setAuthReady(true);
      if (!session) {
        resetBookState();
      }
    });

    return () => {
      mounted = false;
      subscriptionData?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      return;
    }
    loadBookState();
  }, [authReady, user?.id]);

  function resetBookState() {
    api.setActiveBookId(null);
    setBooks([]);
    setActiveBook(null);
    setEntries([]);
    setCurrent(null);
    setView("cover");
    setForm(emptyForm());
    setEditId(null);
    setPostIdx(null);
    setInviteUrl("");
  }

  async function loadBookState(preferredBookId = null) {
    setBookLoading(true);
    setBookError("");
    try {
      let selectedBookId = preferredBookId;
      const code = inviteCode.trim();
      if (code) {
        selectedBookId = await api.joinBook(code);
        setInviteCode("");
        removeInvitationCodeFromUrl();
      }

      const nextBooks = await api.listBooks();
      setBooks(nextBooks);
      const selected = nextBooks.find((book) => book.id === selectedBookId) || nextBooks[0] || null;
      setActiveBook(selected);
      api.setActiveBookId(selected?.id || null);

      if (selected) {
        await loadAll();
      } else {
        setEntries([]);
        setAvatars({ Ollythebigbear: null, Lillythebabyelephant: null });
      }
    } catch (err) {
      console.error("loadBookState:", err);
      setBookError(err.message || "Could not load Adventure Book.");
    } finally {
      setBookLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [list, ...avatarSettings] = await Promise.all([
        api.listEntries(),
        ...PROFILES.map((profile) => api.getSetting("avatar:" + profile)),
      ]);
      const avatarUrls = await Promise.all(
        avatarSettings.map((setting) => (
          setting?.value ? api.getPhotoUrl(setting.value).catch(() => null) : null
        ))
      );
      const nextAvatars = {};
      PROFILES.forEach((profile, index) => {
        nextAvatars[profile] = avatarUrls[index] || null;
      });
      setEntries(list);
      setAvatars(nextAvatars);
    } catch (err) {
      console.error("loadAll:", err);
      setBookError(err.message || "Could not load entries.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const email = formEl.elements.email.value.trim();
    const password = formEl.elements.password.value;
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthError("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setInviteUrl("");
    await supabase.auth.signOut();
  }

  async function createSharedBook() {
    setBookLoading(true);
    setBookError("");
    try {
      const bookId = await api.createBook("Our Adventure Book");
      await loadBookState(bookId);
    } catch (err) {
      setBookError(err.message || "Could not create the book.");
    } finally {
      setBookLoading(false);
    }
  }

  async function joinSharedBook(event) {
    event.preventDefault();
    setBookLoading(true);
    setBookError("");
    try {
      const bookId = await api.joinBook(inviteCode);
      setInviteCode("");
      removeInvitationCodeFromUrl();
      await loadBookState(bookId);
    } catch (err) {
      setBookError(err.message || "Could not join the book.");
    } finally {
      setBookLoading(false);
    }
  }

  async function switchBook(bookId) {
    const selected = books.find((book) => book.id === bookId) || null;
    setActiveBook(selected);
    api.setActiveBookId(selected?.id || null);
    setView("cover");
    setCurrent(null);
    setEditId(null);
    setPostIdx(null);
    setInviteUrl("");
    if (selected) {
      await loadAll();
    }
  }

  async function createInvite() {
    try {
      const code = await api.createInvite();
      const url = new URL(window.location.href);
      url.hash = "";
      url.searchParams.set("invite", code);
      const value = url.toString();
      setInviteUrl(value);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value).catch(() => {});
      }
    } catch (err) {
      setBookError(err.message || "Could not create an invite.");
    }
  }

  async function handleAvatarChange(name, id, src) {
    await api.setSetting("avatar:" + name, id);
    setAvatars((prev) => ({ ...prev, [name]: src }));
  }

  function startNew() {
    setForm(emptyForm());
    setEditId(null);
    setView("picker");
  }

  function pickTemplate(id) {
    setForm(emptyForm(id));
    setView("new");
  }

  async function handleSubmit() {
    const id = editId || crypto.randomUUID();
    const toSave = { ...form, id };
    try {
      await api.saveEntry(toSave);
      await loadAll();
    } catch (err) {
      console.error("save:", err);
      alert("Save failed: " + err.message);
      return;
    }
    setEditId(null);
    setForm(emptyForm());
    setView("contents");
  }

  function openEntry(entry) {
    setCurrent(entry);
    setPostIdx(null);
    setView("entry");
  }

  function startEdit(entry) {
    setForm({
      ...emptyForm(entry.template),
      ...entry,
      photos: (entry.photos || []).map((photo, index) => normPhoto(photo, index)),
      profilePhotoId: entry.profilePhotoId || null,
    });
    setEditId(entry.id);
    setView("new");
  }

  async function deleteEntry(id) {
    if (!window.confirm("Delete this adventure? This cannot be undone.")) return;
    try {
      await api.deleteEntry(id);
    } catch (err) {
      console.error("delete:", err);
    }
    await loadAll();
    setView("contents");
  }

  if (!authReady) {
    return <LoadingScreen message="Loading Adventure Book..." />;
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        error={authError}
        busy={authBusy}
        onMode={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  if (bookLoading && !activeBook) {
    return <LoadingScreen message="Loading your shared book..." />;
  }

  if (!activeBook) {
    return (
      <BookSetup
        error={bookError}
        busy={bookLoading}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        onCreate={createSharedBook}
        onJoin={joinSharedBook}
        onSignOut={signOut}
      />
    );
  }

  if (loading) {
    return <LoadingScreen message="Loading your adventure book..." />;
  }

  const isIGEntry = current && current.template === "instagram";

  return (
    <div>
      <AccountBar
        user={user}
        activeBook={activeBook}
        books={books}
        inviteUrl={inviteUrl}
        onInvite={createInvite}
        onSignOut={signOut}
        onSwitchBook={switchBook}
      />
      {bookError && <div style={floatingErrorStyle}>{bookError}</div>}
      {view === "cover" && <Cover onOpen={() => setView("contents")} />}
      {view === "contents" && (
        <Contents entries={entries} onOpen={openEntry} onNew={startNew} onBack={() => setView("cover")} />
      )}
      {view === "picker" && (
        <TemplatePicker onPick={pickTemplate} onBack={() => setView("contents")} />
      )}
      {view === "entry" && isIGEntry && postIdx === null && (
        <InstagramProfile
          entry={current}
          onBack={() => setView("contents")}
          onEdit={() => startEdit(current)}
          onDelete={() => deleteEntry(current.id)}
          onOpenPost={(index) => setPostIdx(index)}
          avatars={avatars}
        />
      )}
      {view === "entry" && isIGEntry && postIdx !== null && (
        <InstagramPost
          entry={current}
          photoIdx={postIdx}
          onBack={() => setPostIdx(null)}
          avatars={avatars}
        />
      )}
      {view === "entry" && !isIGEntry && current && (
        <EntryView
          entry={current}
          onBack={() => setView("contents")}
          onEdit={() => startEdit(current)}
          onDelete={() => deleteEntry(current.id)}
        />
      )}
      {view === "new" && (
        <EditorPage
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditId(null);
            setForm(emptyForm());
            setView(editId && current ? "contents" : "picker");
          }}
          fileRef={fileRef}
          analyzing={analyzing}
          setAnalyzing={setAnalyzing}
          avatars={avatars}
          onAvatarChange={handleAvatarChange}
        />
      )}
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div style={screenBg("#6ab4d8", "#fdf6e3")}>
      <style>{GF}</style>
      <div style={{ fontSize: "3rem" }}>🎈</div>
      <div style={{ fontFamily: "'Caveat',cursive", fontSize: "1.5rem", color: "#5c3d11" }}>
        {message}
      </div>
    </div>
  );
}

function screenBg(top, bottom) {
  return {
    minHeight: "100vh",
    background: `linear-gradient(180deg,${top},${bottom})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "16px",
    padding: "24px",
    boxSizing: "border-box",
  };
}

const panelStyle = {
  width: "min(420px, 100%)",
  background: "rgba(255,255,255,0.92)",
  color: "#5c3d11",
  border: "2px solid rgba(92,61,17,0.18)",
  borderRadius: "18px",
  boxShadow: "0 18px 55px rgba(74,34,8,0.28)",
  padding: "24px",
  display: "grid",
  gap: "14px",
  fontFamily: "'Lora',serif",
};

const authTitle = {
  margin: 0,
  fontFamily: "'Caveat',cursive",
  fontSize: "2.5rem",
  lineHeight: 1,
};

const authCopy = {
  margin: 0,
  opacity: 0.78,
};

const fieldStyle = {
  display: "grid",
  gap: "6px",
  fontSize: "0.9rem",
  fontWeight: 700,
};

const inputStyle = {
  border: "1.5px solid rgba(92,61,17,0.25)",
  borderRadius: "10px",
  padding: "11px 12px",
  font: "inherit",
};

const primaryButton = {
  border: "none",
  borderRadius: "999px",
  background: "#b45309",
  color: "white",
  padding: "12px 16px",
  font: "inherit",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: "#5c3d11",
};

const linkButton = {
  border: "none",
  background: "transparent",
  color: "#7c2d12",
  padding: "6px",
  font: "inherit",
  cursor: "pointer",
};

const errorStyle = {
  margin: 0,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "10px 12px",
};

const accountBarStyle = {
  position: "fixed",
  zIndex: 1000,
  left: "12px",
  bottom: "12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  maxWidth: "calc(100vw - 24px)",
  background: "rgba(34,14,2,0.82)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: "14px",
  padding: "8px",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontSize: "0.78rem",
  boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
};

const accountButtonStyle = {
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  padding: "5px 9px",
  font: "inherit",
  cursor: "pointer",
};

const accountSelectStyle = {
  ...accountButtonStyle,
  maxWidth: "160px",
};

const accountBookStyle = {
  fontWeight: 800,
};

const accountEmailStyle = {
  opacity: 0.78,
};

const inviteInputStyle = {
  minWidth: "min(360px, calc(100vw - 48px))",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.95)",
  color: "#3b2208",
  padding: "6px 8px",
  font: "inherit",
};

const floatingErrorStyle = {
  position: "fixed",
  zIndex: 1001,
  left: "12px",
  top: "12px",
  maxWidth: "min(480px, calc(100vw - 24px))",
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "10px 12px",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontSize: "0.86rem",
};
