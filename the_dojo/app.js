(function () {
  "use strict";

  const SUPABASE_URL = "https://dyxqnvokqpwxgtqothcr.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PZg_kpXc1g88DtTP6IJ6ew_WeYpbNpu";
  const SCHEMA_VERSION = 4;

  const root = document.getElementById("app-root");
  const screenLabel = document.getElementById("screen-label");
  const moreButton = document.getElementById("more-button");
  const exportButton = document.getElementById("export-button");
  const importInput = document.getElementById("import-input");
  const actionsDialog = document.getElementById("actions-dialog");
  const sessionActions = document.getElementById("session-actions");
  const toast = document.getElementById("toast");
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  let supabaseClient = null;
  let currentUser = null;
  let state = emptyState();
  let selectedExerciseId = null;
  let dragState = null;
  let toastTimer = 0;
  let authMode = "sign-in";
  let activeTagFilter = null;
  let reloadingForController = false;
  let recoveringFromStuck = false;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadingForController) {
        return;
      }
      reloadingForController = true;
      window.location.reload();
    });
  }

  async function recoverFromStuck() {
    if (recoveringFromStuck) {
      return;
    }
    recoveringFromStuck = true;
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      console.warn("Recovery failed.", error);
    }
    window.location.reload();
  }

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exercises: [],
      entries: []
    };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    throw new Error("This browser does not support random UUIDs.");
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
  }

  function todayLocalDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseTags(value) {
    const source = Array.isArray(value) ? value.join(",") : String(value || "");
    const seen = new Set();
    const tags = [];

    for (const part of source.split(",")) {
      const tag = part.trim().replace(/\s+/g, " ");
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) {
        continue;
      }

      seen.add(key);
      tags.push(tag);
    }

    return tags.slice(0, 8);
  }

  function primaryTag(exercise) {
    return exercise.tags && exercise.tags.length ? exercise.tags[0] : "";
  }

  function groupKeyForExercise(exercise) {
    const tag = primaryTag(exercise);
    return tag ? tag.toLocaleLowerCase() : "__untagged";
  }

  function normalizeImportedState(value) {
    const next = emptyState();
    const exercises = Array.isArray(value && value.exercises) ? value.exercises : [];
    const entries = Array.isArray(value && value.entries) ? value.entries : [];

    next.exercises = exercises
      .filter((exercise) => exercise && exercise.id && exercise.name)
      .map((exercise, index) => ({
        id: String(exercise.id),
        name: String(exercise.name).trim(),
        tags: parseTags(exercise.tags || exercise.tag || ""),
        sortOrder: Number.isFinite(Number(exercise.sortOrder)) ? Number(exercise.sortOrder) : (index + 1) * 1000,
        createdAt: String(exercise.createdAt || nowIso()),
        updatedAt: String(exercise.updatedAt || exercise.createdAt || nowIso())
      }));

    const exerciseIds = new Set(next.exercises.map((exercise) => exercise.id));
    next.entries = entries
      .filter((entry) => entry && entry.id && exerciseIds.has(String(entry.exerciseId)) && entry.date)
      .map((entry) => ({
        id: String(entry.id),
        exerciseId: String(entry.exerciseId),
        date: String(entry.date),
        resistance: String(entry.resistance || ""),
        sets: String(entry.sets || ""),
        reps: String(entry.reps || ""),
        notes: String(entry.notes || entry.modifier || ""),
        createdAt: String(entry.createdAt || nowIso()),
        updatedAt: String(entry.updatedAt || entry.createdAt || nowIso())
      }));

    next.exercises.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    next.exercises.forEach((exercise, index) => {
      exercise.sortOrder = (index + 1) * 1000;
    });

    return next;
  }

  function exerciseFromRow(row) {
    return {
      id: row.id,
      name: row.name,
      tags: parseTags(row.tags || []),
      sortOrder: Number(row.sort_order) || 1000,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function entryFromRow(row) {
    return {
      id: row.id,
      exerciseId: row.exercise_id,
      date: row.date,
      resistance: row.resistance || "",
      sets: row.sets || "",
      reps: row.reps || "",
      notes: row.notes || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  function requireUser() {
    if (!currentUser) {
      throw new Error("Sign in first.");
    }

    return currentUser;
  }

  function handleSupabaseError(error) {
    if (!error) {
      return;
    }

    console.error(error);
    showToast(error.message || "Supabase request failed.");
  }

  function sortedEntriesForExercise(exerciseId) {
    return state.entries
      .filter((entry) => entry.exerciseId === exerciseId)
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  function latestEntryForExercise(exerciseId) {
    return sortedEntriesForExercise(exerciseId)[0] || null;
  }

  function sortedExercises() {
    return [...state.exercises].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }

  function allTagsWithCounts() {
    const counts = new Map();
    for (const exercise of state.exercises) {
      for (const tag of exercise.tags || []) {
        const key = tag.toLocaleLowerCase();
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { tag, count: 1 });
        }
      }
    }
    return [...counts.values()].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" });
    });
  }

  function exerciseMatchesActiveFilter(exercise) {
    if (!activeTagFilter) {
      return true;
    }
    const target = activeTagFilter.toLocaleLowerCase();
    return (exercise.tags || []).some((tag) => tag.toLocaleLowerCase() === target);
  }

  function groupedExercises(exercises) {
    const groupsByKey = new Map();
    for (const exercise of exercises) {
      const key = groupKeyForExercise(exercise);
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, {
          key,
          label: key === "__untagged" ? "Untagged" : primaryTag(exercise),
          exercises: []
        });
      }

      groupsByKey.get(key).exercises.push(exercise);
    }

    return [...groupsByKey.values()].sort((a, b) => {
      if (a.key === "__untagged") {
        return 1;
      }
      if (b.key === "__untagged") {
        return -1;
      }
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
  }

  function nextSortOrder() {
    return state.exercises.reduce((max, exercise) => Math.max(max, Number(exercise.sortOrder) || 0), 0) + 1000;
  }

  function formatDate(value) {
    const parts = String(value).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return value;
    }
    return dateFormatter.format(new Date(parts[0], parts[1] - 1, parts[2]));
  }

  function entrySummary(entry) {
    if (!entry) {
      return "No rows yet";
    }

    const pieces = [];
    if (entry.resistance) {
      pieces.push(entry.resistance);
    }
    if (entry.sets || entry.reps) {
      const setText = entry.sets ? `${entry.sets} ${entry.sets === "1" ? "set" : "sets"}` : "";
      const repText = entry.reps ? `${entry.reps} reps` : "";
      pieces.push([setText, repText].filter(Boolean).join(" x "));
    }
    if (entry.notes) {
      pieces.push(entry.notes);
    }

    const detail = pieces.length ? pieces.join(" / ") : "Logged";
    return `${formatDate(entry.date)} - ${detail}`;
  }

  function render() {
    renderHeader();

    if (!supabaseClient) {
      renderError("Supabase did not load. Check your network connection.");
      return;
    }

    if (!currentUser) {
      renderAuth();
      return;
    }

    const selectedExercise = state.exercises.find((exercise) => exercise.id === selectedExerciseId);
    if (selectedExercise) {
      renderExercise(selectedExercise);
      return;
    }

    selectedExerciseId = null;
    renderHome();
  }

  function renderHeader() {
    const signedIn = Boolean(currentUser);
    moreButton.hidden = !signedIn;
    moreButton.setAttribute("aria-expanded", "false");

    if (!sessionActions) {
      return;
    }

    if (!signedIn) {
      sessionActions.innerHTML = "";
      return;
    }

    sessionActions.innerHTML = `
      <span class="user-email">${escapeHtml(currentUser.email || "Signed in")}</span>
      <button id="sign-out-button" class="button button-secondary" type="button">Sign out</button>
    `;
  }

  function renderAuth() {
    screenLabel.textContent = authMode === "register" ? "Create your account" : "Sign in to continue";
    state = emptyState();
    selectedExerciseId = null;

    if (authMode === "register") {
      root.innerHTML = `
        <section class="auth-panel">
          <div class="auth-copy">
            <h2>Create your account.</h2>
            <p>Register to start logging your training.</p>
          </div>
          <form id="register-form" class="auth-form" autocomplete="on">
            <label class="field">
              <span>Email</span>
              <input class="text-input" name="email" type="email" autocomplete="email" required>
            </label>
            <label class="field">
              <span>Password</span>
              <input class="text-input" name="password" type="password" autocomplete="new-password" minlength="6" required>
            </label>
            <button class="button button-primary" type="submit">Create account</button>
          </form>
          <p class="auth-toggle">
            Already have an account?
            <button type="button" class="link-button" data-action="auth-mode" data-mode="sign-in">Sign in</button>
          </p>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="auth-panel">
        <div class="auth-copy">
          <h2>Welcome back.</h2>
          <p>Sign in to load your training log.</p>
        </div>
        <form id="sign-in-form" class="auth-form" autocomplete="on">
          <label class="field">
            <span>Email</span>
            <input class="text-input" name="email" type="email" autocomplete="email" required>
          </label>
          <label class="field">
            <span>Password</span>
            <input class="text-input" name="password" type="password" autocomplete="current-password" minlength="6" required>
          </label>
          <button class="button button-primary" type="submit">Sign in</button>
        </form>
        <p class="auth-toggle">
          New here?
          <button type="button" class="link-button" data-action="auth-mode" data-mode="register">Register now</button>
        </p>
      </section>
    `;
  }

  function renderLoading(message) {
    screenLabel.textContent = "Loading";
    root.innerHTML = `
      <section class="empty-state" aria-live="polite">
        <h2>${escapeHtml(message || "Loading")}</h2>
        <p>Taking too long?
          <button type="button" class="link-button" data-action="reset-app">Reset and reload</button>
        </p>
      </section>
    `;
  }

  function renderError(message) {
    screenLabel.textContent = "Error";
    root.innerHTML = `
      <section class="empty-state" aria-live="polite">
        <h2>${escapeHtml(message)}</h2>
      </section>
    `;
  }

  function renderHome() {
    const allExercises = sortedExercises();
    const tags = allTagsWithCounts();

    if (activeTagFilter && !tags.some((entry) => entry.tag.toLocaleLowerCase() === activeTagFilter.toLocaleLowerCase())) {
      activeTagFilter = null;
    }

    const visible = allExercises.filter(exerciseMatchesActiveFilter);
    screenLabel.textContent = activeTagFilter ? `Tag · ${activeTagFilter}` : "Exercises";

    let listMarkup;
    if (!allExercises.length) {
      listMarkup = renderEmpty("No exercises yet.");
    } else if (!visible.length) {
      listMarkup = renderEmpty("No exercises match this tag.");
    } else if (activeTagFilter) {
      listMarkup = renderFlatList(visible);
    } else {
      listMarkup = renderExerciseList(visible);
    }

    root.innerHTML = `
      <section class="panel">
        <form id="exercise-form" class="add-form exercise-form" autocomplete="off">
          <label class="field">
            <span>Exercise</span>
            <input class="text-input" id="exercise-name" name="name" type="text" maxlength="80" placeholder="Bench press" required>
          </label>
          <label class="field">
            <span>Tags</span>
            <input class="text-input" name="tags" type="text" maxlength="120" placeholder="push, barbell">
          </label>
          <button class="button button-primary" type="submit">Add</button>
        </form>
        ${tags.length ? renderTagFilter(tags, allExercises.length) : ""}
        ${listMarkup}
      </section>
    `;
  }

  function renderTagFilter(tags, totalCount) {
    const allActive = activeTagFilter ? "" : "is-active";
    const chips = tags.map(({ tag, count }) => {
      const active = activeTagFilter && activeTagFilter.toLocaleLowerCase() === tag.toLocaleLowerCase();
      return `
        <button type="button" class="filter-chip ${active ? "is-active" : ""}" data-action="filter-tag" data-tag="${escapeHtml(tag)}">
          <span>${escapeHtml(tag)}</span>
          <span class="filter-count">${count}</span>
        </button>
      `;
    }).join("");

    return `
      <div class="tag-filter" role="group" aria-label="Filter exercises by tag">
        <button type="button" class="filter-chip ${allActive}" data-action="filter-tag" data-tag="">
          <span>All</span>
          <span class="filter-count">${totalCount}</span>
        </button>
        ${chips}
      </div>
    `;
  }

  function renderFlatList(exercises) {
    return `
      <div class="exercise-list flat-list" aria-label="Exercises">
        ${exercises.map((exercise) => renderExerciseCard(exercise, { reorderable: false })).join("")}
      </div>
    `;
  }

  function renderExerciseList(exercises) {
    const groups = groupedExercises(exercises);

    return `
      <div class="exercise-groups" aria-label="Exercises">
        ${groups.map((group) => `
          <section class="exercise-group">
            <div class="group-heading">
              <h3>${escapeHtml(group.label)}</h3>
              <span>${group.exercises.length === 1 ? "1 exercise" : `${group.exercises.length} exercises`}</span>
            </div>
            <div class="exercise-list">
              ${group.exercises.map((exercise) => renderExerciseCard(exercise)).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    `;
  }

  function renderTagChips(tags) {
    if (!tags || !tags.length) {
      return "";
    }

    return `
      <span class="tag-list">
        ${tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}
      </span>
    `;
  }

  function renderExerciseCard(exercise, options) {
    const reorderable = !options || options.reorderable !== false;
    const entries = sortedEntriesForExercise(exercise.id);
    const latest = entries[0] || null;
    const countText = entries.length === 1 ? "1 row" : `${entries.length} rows`;
    const handleMarkup = reorderable
      ? `<button class="drag-handle" type="button" data-drag-handle data-id="${escapeHtml(exercise.id)}" aria-label="Drag ${escapeHtml(exercise.name)} to reorder. Use arrow keys to move."></button>`
      : "";

    return `
      <article class="exercise-card" data-exercise-id="${escapeHtml(exercise.id)}">
        <button class="exercise-open" type="button" data-action="open-exercise" data-id="${escapeHtml(exercise.id)}">
          <span class="exercise-main">
            <span class="exercise-name">${escapeHtml(exercise.name)}</span>
            ${renderTagChips(exercise.tags)}
            <span class="exercise-meta">${escapeHtml(entrySummary(latest))}</span>
          </span>
        </button>
        <div class="exercise-tools" aria-label="Exercise controls">
          <span class="exercise-count">${escapeHtml(countText)}</span>
          ${handleMarkup}
        </div>
      </article>
    `;
  }

  function renderExercise(exercise) {
    const entries = sortedEntriesForExercise(exercise.id);
    const latest = entries[0] || null;
    screenLabel.textContent = entrySummary(latest);

    root.innerHTML = `
      <section class="panel">
        <div class="detail-head">
          <button class="icon-button" type="button" aria-label="Back to exercises" data-action="back">&larr;</button>
          <div class="detail-title">
            <h2>${escapeHtml(exercise.name)}</h2>
            ${exercise.tags.length ? renderTagChips(exercise.tags) : `<p class="exercise-meta">No tags</p>`}
            <div class="detail-actions">
              <details class="edit-exercise-panel">
                <summary>Edit</summary>
                <form id="exercise-edit-form" class="edit-exercise-form" autocomplete="off">
                  <label class="field">
                    <span>Name</span>
                    <input class="text-input" name="name" type="text" maxlength="80" value="${escapeHtml(exercise.name)}" required>
                  </label>
                  <label class="field">
                    <span>Tags</span>
                    <input class="text-input" name="tags" type="text" maxlength="120" value="${escapeHtml(exercise.tags.join(", "))}">
                  </label>
                  <button class="button button-primary" type="submit">Save</button>
                </form>
              </details>
              <button class="icon-button danger-icon" type="button" data-action="delete-exercise" aria-label="Delete exercise">&times;</button>
            </div>
          </div>
        </div>

        <form id="entry-form" class="entry-form" autocomplete="off">
          <div class="entry-fields">
            <label class="field">
              <span>Resistance</span>
              <input class="text-input" name="resistance" type="text" inputmode="decimal" maxlength="40" placeholder="50 lb">
            </label>
            <label class="field">
              <span>Sets</span>
              <input class="text-input" name="sets" type="text" inputmode="numeric" maxlength="24" placeholder="3">
            </label>
            <label class="field">
              <span>Reps</span>
              <input class="text-input" name="reps" type="text" inputmode="numeric" maxlength="24" placeholder="10">
            </label>
            <label class="field">
              <span>Notes</span>
              <input class="text-input" name="notes" type="text" maxlength="120" placeholder="slow, assisted, clean">
            </label>
          </div>
          <button class="button button-primary" type="submit">Add row</button>
        </form>

        ${entries.length ? renderEntryTable(entries) : renderEmpty("No rows yet.")}
      </section>
    `;
  }

  function renderEntryTable(entries) {
    return `
      <div class="table-shell">
        <div class="entry-table" role="table" aria-label="Exercise entries">
          <div class="entry-row entry-header" role="row">
            <span class="table-heading" role="columnheader">Date</span>
            <span class="table-heading" role="columnheader">Resistance</span>
            <span class="table-heading" role="columnheader">Sets</span>
            <span class="table-heading" role="columnheader">Reps</span>
            <span class="table-heading" role="columnheader">Notes</span>
            <span class="table-heading" role="columnheader">Del</span>
          </div>
          ${entries.map((entry) => `
            <div class="entry-row" role="row" data-entry-id="${escapeHtml(entry.id)}">
              <span class="entry-date">${escapeHtml(formatDate(entry.date))}</span>
              <input class="text-input" aria-label="Resistance" type="text" inputmode="decimal" maxlength="40" data-entry-field="resistance" value="${escapeHtml(entry.resistance)}">
              <input class="text-input" aria-label="Sets" type="text" inputmode="numeric" maxlength="24" data-entry-field="sets" value="${escapeHtml(entry.sets)}">
              <input class="text-input" aria-label="Reps" type="text" inputmode="numeric" maxlength="24" data-entry-field="reps" value="${escapeHtml(entry.reps)}">
              <input class="text-input" aria-label="Notes" type="text" maxlength="120" data-entry-field="notes" value="${escapeHtml(entry.notes)}">
              <button class="icon-button" type="button" aria-label="Delete row" data-action="delete-entry">&times;</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderEmpty(message) {
    return `
      <section class="empty-state" aria-live="polite">
        <h2>${escapeHtml(message)}</h2>
      </section>
    `;
  }

  async function loadRemoteState() {
    if (!currentUser) {
      state = emptyState();
      render();
      return;
    }

    renderLoading("Loading exercises");

    let timedOut = false;
    const timeoutHandle = window.setTimeout(() => {
      timedOut = true;
      renderLoading("Still loading. Resetting…");
      recoverFromStuck();
    }, 12000);

    const fetchExercises = supabaseClient
      .from("exercises")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    const fetchEntries = supabaseClient
      .from("exercise_entries")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    let exerciseResult;
    let entryResult;
    try {
      [exerciseResult, entryResult] = await Promise.all([fetchExercises, fetchEntries]);
    } catch (error) {
      window.clearTimeout(timeoutHandle);
      if (timedOut) {
        return;
      }
      handleSupabaseError(error);
      renderError("Could not load Supabase data. Check your connection and try again.");
      return;
    }

    window.clearTimeout(timeoutHandle);
    if (timedOut) {
      return;
    }

    if (exerciseResult.error || entryResult.error) {
      handleSupabaseError(exerciseResult.error || entryResult.error);
      renderError("Could not load Supabase data. Make sure the schema has been created.");
      return;
    }

    state = {
      schemaVersion: SCHEMA_VERSION,
      exercises: (exerciseResult.data || []).map(exerciseFromRow),
      entries: (entryResult.data || []).map(entryFromRow)
    };
    render();
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (!email || !password) {
      showToast("Email and password are required.");
      return;
    }

    const button = form.querySelector("button");
    button.disabled = true;

    try {
      if (form.id === "sign-in-form") {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }

        currentUser = data.user;
        await loadRemoteState();
        showToast("Signed in.");
        return;
      }

      const redirectUrl = window.location.href.split("#")[0];
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        currentUser = data.user;
        await loadRemoteState();
        showToast("Account created.");
      } else {
        showToast("Check your email to confirm your account.");
      }
    } catch (error) {
      handleSupabaseError(error);
    } finally {
      button.disabled = false;
    }
  }

  async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      handleSupabaseError(error);
      return;
    }

    currentUser = null;
    state = emptyState();
    selectedExerciseId = null;
    authMode = "sign-in";
    render();
    showToast("Signed out.");
  }

  async function handleAddExercise(event) {
    event.preventDefault();
    const user = requireUser();
    const form = event.target;
    const name = form.elements.name.value.trim();

    if (!name) {
      showToast("Exercise name is required.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("exercises")
      .insert({
        user_id: user.id,
        name,
        tags: parseTags(form.elements.tags.value),
        sort_order: nextSortOrder()
      })
      .select("*")
      .single();

    if (error) {
      handleSupabaseError(error);
      return;
    }

    state.exercises.push(exerciseFromRow(data));
    render();
    showToast("Exercise added.");
  }

  async function handleAddEntry(event) {
    event.preventDefault();
    const user = requireUser();
    const form = event.target;
    const selectedExercise = state.exercises.find((exercise) => exercise.id === selectedExerciseId);
    if (!selectedExercise) {
      return;
    }

    const date = todayLocalDate();
    const resistance = form.elements.resistance.value.trim();
    const sets = form.elements.sets.value.trim();
    const reps = form.elements.reps.value.trim();
    const notes = form.elements.notes.value.trim();

    if (!resistance && !sets && !reps && !notes) {
      showToast("Add at least one value.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("exercise_entries")
      .insert({
        user_id: user.id,
        exercise_id: selectedExercise.id,
        date,
        resistance,
        sets,
        reps,
        notes
      })
      .select("*")
      .single();

    if (error) {
      handleSupabaseError(error);
      return;
    }

    state.entries.push(entryFromRow(data));
    render();
    showToast("Row added.");
  }

  async function updateEntryField(input) {
    const user = requireUser();
    const row = input.closest("[data-entry-id]");
    if (!row) {
      return;
    }

    const entry = state.entries.find((item) => item.id === row.dataset.entryId);
    const field = input.dataset.entryField;
    if (!entry || !["resistance", "sets", "reps", "notes"].includes(field)) {
      return;
    }

    const nextValue = input.value.trim();
    if (entry[field] === nextValue) {
      return;
    }

    const previousValue = entry[field];
    entry[field] = nextValue;
    entry.updatedAt = nowIso();

    const columnByField = {
      resistance: "resistance",
      sets: "sets",
      reps: "reps",
      notes: "notes"
    };

    const { data, error } = await supabaseClient
      .from("exercise_entries")
      .update({
        [columnByField[field]]: nextValue,
        updated_at: nowIso()
      })
      .eq("id", entry.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      entry[field] = previousValue;
      handleSupabaseError(error);
      render();
      return;
    }

    Object.assign(entry, entryFromRow(data));
  }

  function handleRootClick(event) {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.action;
    if (action === "reset-app") {
      recoverFromStuck();
      return;
    }

    if (action === "auth-mode") {
      authMode = actionTarget.dataset.mode === "register" ? "register" : "sign-in";
      render();
      return;
    }

    if (action === "filter-tag") {
      const tag = actionTarget.dataset.tag || "";
      activeTagFilter = tag ? tag : null;
      render();
      return;
    }

    if (action === "open-exercise") {
      selectedExerciseId = actionTarget.dataset.id;
      render();
      return;
    }

    if (action === "back") {
      selectedExerciseId = null;
      render();
      return;
    }

    if (action === "delete-exercise") {
      deleteSelectedExercise();
      return;
    }

    if (action === "delete-entry") {
      const row = actionTarget.closest("[data-entry-id]");
      if (row) {
        deleteEntry(row.dataset.entryId);
      }
    }
  }

  async function moveExercise(exerciseId, direction) {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise || !direction) {
      return;
    }

    const key = groupKeyForExercise(exercise);
    const group = sortedExercises().filter((item) => groupKeyForExercise(item) === key);
    const currentIndex = group.findIndex((item) => item.id === exerciseId);
    const nextIndex = currentIndex + direction;
    const swapExercise = group[nextIndex];

    if (currentIndex < 0 || !swapExercise) {
      return;
    }

    const ids = group.map((item) => item.id);
    ids[currentIndex] = swapExercise.id;
    ids[nextIndex] = exercise.id;
    await applyGroupOrder(key, ids);
  }

  function startExerciseDrag(event) {
    const handle = event.target.closest("[data-drag-handle]");
    if (!handle || !root.contains(handle)) {
      return;
    }

    const card = handle.closest(".exercise-card");
    const list = handle.closest(".exercise-list");
    const exercise = state.exercises.find((item) => item.id === handle.dataset.id);
    if (!card || !list || !exercise) {
      return;
    }

    dragState = {
      card,
      exerciseId: exercise.id,
      groupKey: groupKeyForExercise(exercise),
      list,
      pointerId: event.pointerId
    };

    card.classList.add("is-dragging");
    list.classList.add("is-reordering");
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveExerciseDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const target = getDragTarget(dragState.list, dragState.card, event.clientY);
    if (target) {
      dragState.list.insertBefore(dragState.card, target);
    } else {
      dragState.list.appendChild(dragState.card);
    }

    event.preventDefault();
  }

  async function finishExerciseDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const orderedIds = [...dragState.list.querySelectorAll(".exercise-card")]
      .map((card) => card.dataset.exerciseId)
      .filter(Boolean);
    const key = dragState.groupKey;

    dragState.card.classList.remove("is-dragging");
    dragState.list.classList.remove("is-reordering");
    dragState = null;
    event.preventDefault();
    await applyGroupOrder(key, orderedIds);
  }

  function cancelExerciseDrag() {
    if (!dragState) {
      return;
    }

    dragState.card.classList.remove("is-dragging");
    dragState.list.classList.remove("is-reordering");
    dragState = null;
    render();
  }

  function getDragTarget(list, draggingCard, pointerY) {
    const cards = [...list.querySelectorAll(".exercise-card:not(.is-dragging)")];
    return cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return pointerY < rect.top + rect.height / 2;
    }) || null;
  }

  async function applyGroupOrder(groupKey, orderedIds) {
    const user = requireUser();
    const orderedExercises = sortedExercises();
    const groupExercises = orderedIds
      .map((id) => state.exercises.find((exercise) => exercise.id === id))
      .filter((exercise) => exercise && groupKeyForExercise(exercise) === groupKey);

    if (groupExercises.length !== orderedIds.length) {
      render();
      return;
    }

    let groupIndex = 0;
    for (let index = 0; index < orderedExercises.length; index += 1) {
      if (groupKeyForExercise(orderedExercises[index]) === groupKey) {
        orderedExercises[index] = groupExercises[groupIndex];
        groupIndex += 1;
      }
    }

    orderedExercises.forEach((exercise, index) => {
      exercise.sortOrder = (index + 1) * 1000;
    });

    const updates = orderedExercises.map((exercise) => (
      supabaseClient
        .from("exercises")
        .update({
          sort_order: exercise.sortOrder,
          updated_at: nowIso()
        })
        .eq("id", exercise.id)
        .eq("user_id", user.id)
    ));

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed) {
      handleSupabaseError(failed.error);
      await loadRemoteState();
      return;
    }

    render();
    showToast("Order updated.");
  }

  async function handleReorderKeydown(event) {
    const handle = event.target.closest("[data-drag-handle]");
    if (!handle || !root.contains(handle)) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      await moveExercise(handle.dataset.id, -1);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      await moveExercise(handle.dataset.id, 1);
    }
  }

  async function handleEditExercise(event) {
    event.preventDefault();
    const user = requireUser();
    const exercise = state.exercises.find((item) => item.id === selectedExerciseId);
    if (!exercise) {
      return;
    }

    const form = event.target;
    const name = form.elements.name.value.trim();
    const tags = parseTags(form.elements.tags.value);
    if (!name) {
      showToast("Exercise name is required.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("exercises")
      .update({
        name,
        tags,
        updated_at: nowIso()
      })
      .eq("id", exercise.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      handleSupabaseError(error);
      return;
    }

    Object.assign(exercise, exerciseFromRow(data));
    render();
    showToast("Exercise updated.");
  }

  async function deleteSelectedExercise() {
    const user = requireUser();
    const exercise = state.exercises.find((item) => item.id === selectedExerciseId);
    if (!exercise) {
      return;
    }

    const confirmed = window.confirm(`Delete "${exercise.name}" and all rows from The Dojo?`);
    if (!confirmed) {
      return;
    }

    const { error } = await supabaseClient
      .from("exercises")
      .delete()
      .eq("id", exercise.id)
      .eq("user_id", user.id);

    if (error) {
      handleSupabaseError(error);
      return;
    }

    state.exercises = state.exercises.filter((item) => item.id !== exercise.id);
    state.entries = state.entries.filter((entry) => entry.exerciseId !== exercise.id);
    selectedExerciseId = null;
    render();
    showToast("Exercise deleted.");
  }

  async function deleteEntry(entryId) {
    const user = requireUser();
    const confirmed = window.confirm("Delete this row from The Dojo?");
    if (!confirmed) {
      return;
    }

    const { error } = await supabaseClient
      .from("exercise_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", user.id);

    if (error) {
      handleSupabaseError(error);
      return;
    }

    state.entries = state.entries.filter((entry) => entry.id !== entryId);
    render();
    showToast("Row deleted.");
  }

  function exportData() {
    if (!currentUser) {
      showToast("Sign in first.");
      return;
    }

    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-dojo-${todayLocalDate()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    closeActionsDialog();
    showToast("Export started.");
  }

  async function importData(file) {
    if (!file) {
      return;
    }

    const user = requireUser();
    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      try {
        const incoming = normalizeImportedState(JSON.parse(String(reader.result || "")));
        const confirmed = window.confirm("Replace all The Dojo data in your Supabase account with this import?");
        if (!confirmed) {
          return;
        }

        renderLoading("Importing backup");

        const entryDelete = await supabaseClient
          .from("exercise_entries")
          .delete()
          .eq("user_id", user.id);
        if (entryDelete.error) {
          throw entryDelete.error;
        }

        const exerciseDelete = await supabaseClient
          .from("exercises")
          .delete()
          .eq("user_id", user.id);
        if (exerciseDelete.error) {
          throw exerciseDelete.error;
        }

        const idMap = new Map();
        const exerciseRows = incoming.exercises.map((exercise) => {
          const id = isUuid(exercise.id) ? exercise.id : makeId();
          idMap.set(exercise.id, id);
          return {
            id,
            user_id: user.id,
            name: exercise.name,
            tags: exercise.tags,
            sort_order: exercise.sortOrder,
            created_at: exercise.createdAt,
            updated_at: exercise.updatedAt
          };
        });

        if (exerciseRows.length) {
          const { error } = await supabaseClient.from("exercises").insert(exerciseRows);
          if (error) {
            throw error;
          }
        }

        const entryRows = incoming.entries
          .filter((entry) => idMap.has(entry.exerciseId))
          .map((entry) => ({
            id: isUuid(entry.id) ? entry.id : makeId(),
            user_id: user.id,
            exercise_id: idMap.get(entry.exerciseId),
            date: entry.date,
            resistance: entry.resistance,
            sets: entry.sets,
            reps: entry.reps,
            notes: entry.notes,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt
          }));

        if (entryRows.length) {
          const { error } = await supabaseClient.from("exercise_entries").insert(entryRows);
          if (error) {
            throw error;
          }
        }

        selectedExerciseId = null;
        await loadRemoteState();
        closeActionsDialog();
        showToast("Import complete.");
      } catch (error) {
        handleSupabaseError(error);
        await loadRemoteState();
      } finally {
        importInput.value = "";
      }
    });
    reader.addEventListener("error", () => {
      importInput.value = "";
      showToast("Import failed.");
    });
    reader.readAsText(file);
  }

  function openActionsDialog() {
    if (!currentUser) {
      return;
    }

    moreButton.setAttribute("aria-expanded", "true");
    if (typeof actionsDialog.showModal === "function") {
      actionsDialog.showModal();
      return;
    }

    actionsDialog.setAttribute("open", "");
  }

  function closeActionsDialog() {
    moreButton.setAttribute("aria-expanded", "false");
    if (actionsDialog.open && typeof actionsDialog.close === "function") {
      actionsDialog.close();
      return;
    }

    actionsDialog.removeAttribute("open");
  }

  async function bootstrap() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      render();
      return;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        currentUser = null;
        state = emptyState();
        selectedExerciseId = null;
        render();
      }

      if (event === "SIGNED_IN" && session && session.user && session.user.id !== (currentUser && currentUser.id)) {
        currentUser = session.user;
        await loadRemoteState();
      }
    });

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      handleSupabaseError(error);
      renderAuth();
      return;
    }

    currentUser = data.session ? data.session.user : null;
    if (currentUser) {
      await loadRemoteState();
    } else {
      render();
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Service worker registration failed.", error);
      });
    });
  }

  root.addEventListener("submit", (event) => {
    if (event.target.id === "exercise-form") {
      handleAddExercise(event);
    }

    if (event.target.id === "entry-form") {
      handleAddEntry(event);
    }

    if (event.target.id === "exercise-edit-form") {
      handleEditExercise(event);
    }

    if (event.target.id === "sign-in-form" || event.target.id === "register-form") {
      handleAuthSubmit(event);
    }
  });

  root.addEventListener("click", handleRootClick);
  root.addEventListener("keydown", handleReorderKeydown);
  root.addEventListener("pointerdown", startExerciseDrag);
  root.addEventListener("pointermove", moveExerciseDrag);
  root.addEventListener("pointerup", finishExerciseDrag);
  root.addEventListener("pointercancel", cancelExerciseDrag);

  root.addEventListener("focusout", (event) => {
    if (event.target.matches("[data-entry-field]")) {
      updateEntryField(event.target);
    }
  });

  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-entry-field]")) {
      updateEntryField(event.target);
    }
  });

  if (sessionActions) {
    sessionActions.addEventListener("click", (event) => {
      if (event.target.id === "sign-out-button") {
        signOut();
      }
    });
  }

  moreButton.addEventListener("click", openActionsDialog);
  actionsDialog.addEventListener("click", (event) => {
    if (event.target === actionsDialog) {
      closeActionsDialog();
    }
  });
  actionsDialog.addEventListener("close", () => {
    moreButton.setAttribute("aria-expanded", "false");
  });
  exportButton.addEventListener("click", exportData);
  importInput.addEventListener("change", () => importData(importInput.files[0]));

  window.addEventListener("online", () => showToast("Online."));
  window.addEventListener("offline", () => showToast("Offline. Supabase data needs network."));

  registerServiceWorker();
  bootstrap();
})();
