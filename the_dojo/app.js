(function () {
  "use strict";

  const SUPABASE_URL = "https://dyxqnvokqpwxgtqothcr.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PZg_kpXc1g88DtTP6IJ6ew_WeYpbNpu";
  const SCHEMA_VERSION = 4;

  const root = document.getElementById("app-root");
  const screenLabel = document.getElementById("screen-label");
  const moreButton = document.getElementById("more-button");
  const settingsContent = document.getElementById("settings-content");
  const actionsDialog = document.getElementById("actions-dialog");
  const addExerciseDialog = document.getElementById("add-exercise-dialog");
  const addExerciseFab = document.getElementById("add-exercise-fab");
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
  let activeLoadToken = 0;
  let editingExerciseId = null;
  let userDefaultEntryFormMode = "quick";
  let entryFormMode = "quick";

  function syncEntryFormModeFromUser() {
    const fromMetadata = currentUser && currentUser.user_metadata && currentUser.user_metadata.entry_form_mode;
    userDefaultEntryFormMode = fromMetadata === "shorthand" ? "shorthand" : "quick";
    entryFormMode = userDefaultEntryFormMode;
  }

  function setSessionEntryFormMode(mode) {
    entryFormMode = mode === "shorthand" ? "shorthand" : "quick";
  }

  async function setUserDefaultEntryFormMode(mode) {
    const next = mode === "shorthand" ? "shorthand" : "quick";
    if (next === userDefaultEntryFormMode) {
      return;
    }

    const previousDefault = userDefaultEntryFormMode;
    const previousSessionMode = entryFormMode;
    userDefaultEntryFormMode = next;
    entryFormMode = next;
    renderSettingsContent();
    render();
    if (!supabaseClient || !currentUser) {
      return;
    }
    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        data: { entry_form_mode: next }
      });
      if (error) {
        throw error;
      }
      if (data && data.user) {
        currentUser = data.user;
        syncEntryFormModeFromUser();
      }
    } catch (error) {
      userDefaultEntryFormMode = previousDefault;
      entryFormMode = previousSessionMode;
      renderSettingsContent();
      render();
      handleSupabaseError(error);
    }
  }

  function parseShorthand(input) {
    const entries = [];
    const errors = [];
    const chunks = String(input || "").split(",").map((chunk) => chunk.trim()).filter(Boolean);

    for (const chunk of chunks) {
      const match = chunk.match(/^(\S+)\s*[x×]\s*([^@]+?)(?:\s*@\s*(.+))?$/i);
      if (!match) {
        errors.push(`Could not read "${chunk}"`);
        continue;
      }
      const sets = match[1].trim();
      const reps = match[2].trim();
      const resistance = (match[3] || "").trim();
      if (!sets || !reps) {
        errors.push(`Missing sets or reps in "${chunk}"`);
        continue;
      }
      entries.push({ sets, reps, resistance });
    }

    return { entries, errors };
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

  function withTimeout(promise, milliseconds, message) {
    let timeoutId = 0;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error(message || "Request timed out."));
      }, milliseconds);
    });

    return Promise.race([promise, timeout]).finally(() => {
      window.clearTimeout(timeoutId);
    });
  }

  function readSessionFlag(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeSessionFlag(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      // Session storage can be unavailable in restrictive browser modes.
    }
  }

  function clearSessionFlag(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      // Session storage can be unavailable in restrictive browser modes.
    }
  }

  async function cleanupOldServiceWorkers() {
    const reloadKey = "the-dojo:sw-clean-reload";
    let hadDojoWorker = false;

    if ("serviceWorker" in navigator) {
      const controller = navigator.serviceWorker.controller;
      hadDojoWorker = Boolean(controller && controller.scriptURL.includes("/the_dojo/"));

      const registrations = await navigator.serviceWorker.getRegistrations();
      const dojoRegistrations = registrations.filter((registration) => registration.scope.includes("/the_dojo/"));
      hadDojoWorker = hadDojoWorker || dojoRegistrations.length > 0;
      await Promise.all(dojoRegistrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      const dojoKeys = keys.filter((key) => key.startsWith("the-dojo-"));
      hadDojoWorker = hadDojoWorker || dojoKeys.length > 0;
      await Promise.all(dojoKeys.map((key) => caches.delete(key)));
    }

    if (hadDojoWorker && readSessionFlag(reloadKey) !== "done") {
      writeSessionFlag(reloadKey, "done");
      window.location.replace(window.location.href);
      return false;
    }

    clearSessionFlag(reloadKey);
    return true;
  }

  async function prepareStartup() {
    try {
      return await withTimeout(
        cleanupOldServiceWorkers(),
        5000,
        "Old app cache cleanup timed out."
      );
    } catch (error) {
      console.warn("Old cache cleanup failed.", error);
      return true;
    }
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
    renderFab();
    renderSettingsContent();

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
    moreButton.hidden = !currentUser;
    moreButton.setAttribute("aria-expanded", actionsDialog && actionsDialog.open ? "true" : "false");
  }

  function renderFab() {
    if (!addExerciseFab) {
      return;
    }
    const inHome = currentUser && !selectedExerciseId;
    addExerciseFab.hidden = !inHome;
  }

  function renderSettingsContent() {
    if (!settingsContent) {
      return;
    }
    if (!currentUser) {
      settingsContent.innerHTML = "";
      return;
    }
    settingsContent.innerHTML = `
      <div class="dialog-head">
        <h2>Settings</h2>
        <button class="icon-button" type="button" data-action="close-settings" aria-label="Close">&times;</button>
      </div>
      <p class="settings-email">${escapeHtml(currentUser.email || "Signed in")}</p>
      <div class="settings-section">
        <span class="settings-label">Default entry form</span>
        <div class="form-mode-toggle">
          <button type="button" class="filter-chip ${userDefaultEntryFormMode === "quick" ? "is-active" : ""}" data-action="set-default-mode" data-mode="quick">Quick</button>
          <button type="button" class="filter-chip ${userDefaultEntryFormMode === "shorthand" ? "is-active" : ""}" data-action="set-default-mode" data-mode="shorthand">Shorthand</button>
        </div>
      </div>
      <div class="settings-divider" role="separator"></div>
      <button class="button button-secondary" type="button" data-action="export">Export JSON</button>
      <label class="button button-secondary file-button">
        Import JSON
        <input id="import-input" type="file" accept="application/json,.json">
      </label>
      <div class="settings-divider" role="separator"></div>
      <button class="button button-secondary" type="button" data-action="sign-out">Sign out</button>
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
      </section>
    `;
  }

  function renderError(message, options) {
    const canRetry = options && options.retry;
    screenLabel.textContent = "Error";
    root.innerHTML = `
      <section class="empty-state" aria-live="polite">
        <h2>${escapeHtml(message)}</h2>
        ${canRetry ? `<p><button type="button" class="link-button" data-action="retry-load">Try again</button></p>` : ""}
      </section>
    `;
  }

  function renderHome() {
    entryFormMode = userDefaultEntryFormMode;
    const allExercises = sortedExercises();
    const tags = allTagsWithCounts();

    if (activeTagFilter && !tags.some((entry) => entry.tag.toLocaleLowerCase() === activeTagFilter.toLocaleLowerCase())) {
      activeTagFilter = null;
    }

    const visible = allExercises.filter(exerciseMatchesActiveFilter);
    screenLabel.textContent = activeTagFilter ? `Tag · ${activeTagFilter}` : "Exercises";

    let listMarkup;
    if (!allExercises.length) {
      listMarkup = renderEmpty("No exercises yet. Tap + to add one.");
    } else if (!visible.length) {
      listMarkup = renderEmpty("No exercises match this tag.");
    } else if (activeTagFilter) {
      listMarkup = renderFlatList(visible);
    } else {
      listMarkup = renderExerciseList(visible);
    }

    root.innerHTML = `
      <section class="panel">
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
          <button class="icon-button is-quiet" type="button" aria-label="Back to exercises" data-action="back">&larr;</button>
          <div class="detail-title">
            <div class="detail-title-row">
              <h2>${escapeHtml(exercise.name)}</h2>
              <div class="detail-actions" role="group" aria-label="Exercise actions">
                <button class="icon-button is-quiet detail-action-button ${editingExerciseId === exercise.id ? "is-active" : ""}" type="button" data-action="toggle-exercise-edit" aria-label="Edit exercise">&#9998;</button>
                <button class="icon-button is-quiet detail-action-button danger" type="button" data-action="delete-exercise" aria-label="Delete exercise">&times;</button>
              </div>
            </div>
            ${exercise.tags.length ? renderTagChips(exercise.tags) : ""}
            ${editingExerciseId === exercise.id ? `
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
            ` : ""}
          </div>
        </div>

        ${renderEntryForm()}

        ${entries.length ? renderEntryTable(entries) : renderEmpty("No rows yet.")}
      </section>
    `;
  }

  function renderEntryForm() {
    const modeRow = `
      <div class="form-mode-row">
        <div class="form-mode-toggle" role="group" aria-label="Entry form mode">
          <button type="button" class="filter-chip ${entryFormMode === "quick" ? "is-active" : ""}" data-action="form-mode" data-mode="quick">Quick</button>
          <button type="button" class="filter-chip ${entryFormMode === "shorthand" ? "is-active" : ""}" data-action="form-mode" data-mode="shorthand">Shorthand</button>
        </div>
        ${entryFormMode === "shorthand" ? `<button type="button" class="icon-button is-quiet" data-action="show-shorthand-help" aria-label="Shorthand help">?</button>` : ""}
      </div>
    `;

    if (entryFormMode === "shorthand") {
      return `
        <form id="entry-form" class="entry-form" autocomplete="off" data-mode="shorthand">
          ${modeRow}
          <label class="field">
            <span>Sets</span>
            <textarea class="text-input shorthand-input" name="shorthand" rows="2" placeholder="2x50@40, 1x40@10" autocomplete="off"></textarea>
          </label>
          <button class="button button-primary" type="submit">Add rows</button>
        </form>
      `;
    }

    return `
      <form id="entry-form" class="entry-form" autocomplete="off" data-mode="quick">
        ${modeRow}
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
        <button class="button button-primary" type="submit">Add</button>
      </form>
    `;
  }

  function renderEntryTable(entries) {
    const groups = [];
    let currentGroup = null;
    for (const entry of entries) {
      if (!currentGroup || currentGroup.date !== entry.date) {
        currentGroup = { date: entry.date, entries: [] };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    }

    return `
      <div class="table-shell">
        <div class="entry-table" role="table" aria-label="Exercise entries">
          <div class="entry-row entry-header" role="row">
            <span class="table-heading" role="columnheader">Resistance</span>
            <span class="table-heading" role="columnheader">Sets</span>
            <span class="table-heading" role="columnheader">Reps</span>
            <span class="table-heading" role="columnheader">Notes</span>
            <span class="table-heading" role="columnheader" aria-label="Delete"></span>
          </div>
          ${groups.map((group) => `
            <div class="entry-day-header" role="rowgroup">
              <span>${escapeHtml(formatDate(group.date))}</span>
              <span class="entry-day-count">${group.entries.length === 1 ? "1 set" : `${group.entries.length} sets`}</span>
            </div>
            ${group.entries.map((entry) => `
              <div class="entry-row" role="row" data-entry-id="${escapeHtml(entry.id)}">
                <label class="entry-cell" data-label="Resistance">
                  <input class="text-input" aria-label="Resistance" type="text" inputmode="decimal" maxlength="40" data-entry-field="resistance" value="${escapeHtml(entry.resistance)}">
                </label>
                <label class="entry-cell" data-label="Sets">
                  <input class="text-input" aria-label="Sets" type="text" inputmode="numeric" maxlength="24" data-entry-field="sets" value="${escapeHtml(entry.sets)}">
                </label>
                <label class="entry-cell" data-label="Reps">
                  <input class="text-input" aria-label="Reps" type="text" inputmode="numeric" maxlength="24" data-entry-field="reps" value="${escapeHtml(entry.reps)}">
                </label>
                <label class="entry-cell" data-label="Notes">
                  <input class="text-input" aria-label="Notes" type="text" maxlength="120" data-entry-field="notes" value="${escapeHtml(entry.notes)}">
                </label>
                <button class="icon-button is-quiet entry-delete" type="button" aria-label="Delete row" data-action="delete-entry">&times;</button>
              </div>
            `).join("")}
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
    const loadToken = activeLoadToken + 1;
    activeLoadToken = loadToken;

    if (!currentUser) {
      state = emptyState();
      render();
      return;
    }

    renderLoading("Loading exercises");

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
      [exerciseResult, entryResult] = await withTimeout(
        Promise.all([fetchExercises, fetchEntries]),
        15000,
        "Could not load exercises. Check your connection and try again."
      );
    } catch (error) {
      if (loadToken !== activeLoadToken) {
        return;
      }
      handleSupabaseError(error);
      renderError("Could not load Supabase data. Check your connection and try again.", { retry: true });
      return;
    }

    if (loadToken !== activeLoadToken) {
      return;
    }

    if (exerciseResult.error || entryResult.error) {
      handleSupabaseError(exerciseResult.error || entryResult.error);
      renderError("Could not load Supabase data. Make sure the schema has been created.", { retry: true });
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
        syncEntryFormModeFromUser();
        await loadRemoteState();
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
        syncEntryFormModeFromUser();
        await loadRemoteState();
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
    activeLoadToken += 1;
    selectedExerciseId = null;
    editingExerciseId = null;
    authMode = "sign-in";
    userDefaultEntryFormMode = "quick";
    entryFormMode = "quick";
    render();
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
    closeAddExerciseDialog();
    render();
  }

  async function handleAddEntry(event) {
    event.preventDefault();
    const user = requireUser();
    const form = event.target;
    const selectedExercise = state.exercises.find((exercise) => exercise.id === selectedExerciseId);
    if (!selectedExercise) {
      return;
    }

    if (form.dataset.mode === "shorthand") {
      await handleAddShorthand(form, user, selectedExercise);
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

    const restoredForm = document.getElementById("entry-form");
    if (restoredForm && restoredForm.dataset.mode === "quick") {
      restoredForm.elements.resistance.value = resistance;
      restoredForm.elements.sets.value = sets;
      restoredForm.elements.reps.value = reps;
      restoredForm.elements.notes.value = notes;
    }
  }

  async function handleAddShorthand(form, user, selectedExercise) {
    const raw = form.elements.shorthand.value;
    const { entries: parsed, errors } = parseShorthand(raw);

    if (!parsed.length) {
      showToast(errors[0] || "Enter at least one set.");
      return;
    }

    const date = todayLocalDate();
    const rows = parsed.map((item) => ({
      user_id: user.id,
      exercise_id: selectedExercise.id,
      date,
      resistance: item.resistance,
      sets: item.sets,
      reps: item.reps,
      notes: ""
    }));

    const { data, error } = await supabaseClient
      .from("exercise_entries")
      .insert(rows)
      .select("*");

    if (error) {
      handleSupabaseError(error);
      return;
    }

    for (const row of data || []) {
      state.entries.push(entryFromRow(row));
    }
    render();

    if (errors.length) {
      showToast(`Added ${data.length}. Skipped: ${errors.join("; ")}`);
    }
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
    if (action === "retry-load") {
      loadRemoteState();
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

    if (action === "form-mode") {
      const nextMode = actionTarget.dataset.mode === "shorthand" ? "shorthand" : "quick";
      if (nextMode === entryFormMode) {
        return;
      }
      setSessionEntryFormMode(nextMode);
      render();
      return;
    }

    if (action === "open-add-exercise") {
      openAddExerciseDialog();
      return;
    }

    if (action === "show-shorthand-help") {
      openShorthandHelp();
      return;
    }

    if (action === "open-exercise") {
      editingExerciseId = null;
      entryFormMode = userDefaultEntryFormMode;
      selectedExerciseId = actionTarget.dataset.id;
      render();
      return;
    }

    if (action === "back") {
      editingExerciseId = null;
      entryFormMode = userDefaultEntryFormMode;
      selectedExerciseId = null;
      render();
      return;
    }

    if (action === "toggle-exercise-edit") {
      editingExerciseId = editingExerciseId === selectedExerciseId ? null : selectedExerciseId;
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
    editingExerciseId = null;
    render();
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
    editingExerciseId = null;
    render();
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
      } catch (error) {
        handleSupabaseError(error);
        await loadRemoteState();
      } finally {
        const importInput = document.getElementById("import-input");
        if (importInput) {
          importInput.value = "";
        }
      }
    });
    reader.addEventListener("error", () => {
      const importInput = document.getElementById("import-input");
      if (importInput) {
        importInput.value = "";
      }
      showToast("Import failed.");
    });
    reader.readAsText(file);
  }

  function openShorthandHelp() {
    const dialog = document.getElementById("shorthand-help-dialog");
    if (!dialog) {
      return;
    }
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }
    dialog.setAttribute("open", "");
  }

  function openActionsDialog() {
    if (!currentUser) {
      return;
    }

    renderSettingsContent();
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

  function openAddExerciseDialog() {
    if (!currentUser || !addExerciseDialog) {
      return;
    }
    const form = addExerciseDialog.querySelector("#exercise-form");
    if (form) {
      form.reset();
    }
    if (typeof addExerciseDialog.showModal === "function") {
      addExerciseDialog.showModal();
    } else {
      addExerciseDialog.setAttribute("open", "");
    }
    if (form) {
      const nameInput = form.querySelector('input[name="name"]');
      if (nameInput) {
        window.requestAnimationFrame(() => nameInput.focus());
      }
    }
  }

  function closeAddExerciseDialog() {
    if (!addExerciseDialog) {
      return;
    }
    if (addExerciseDialog.open && typeof addExerciseDialog.close === "function") {
      addExerciseDialog.close();
      return;
    }
    addExerciseDialog.removeAttribute("open");
  }

  function handleSettingsClick(event) {
    if (event.target === actionsDialog) {
      closeActionsDialog();
      return;
    }
    const target = event.target.closest("[data-action]");
    if (!target) {
      return;
    }
    const action = target.dataset.action;
    if (action === "close-settings") {
      closeActionsDialog();
      return;
    }
    if (action === "set-default-mode") {
      setUserDefaultEntryFormMode(target.dataset.mode);
      return;
    }
    if (action === "export") {
      exportData();
      return;
    }
    if (action === "sign-out") {
      closeActionsDialog();
      signOut();
      return;
    }
  }

  function handleAddExerciseDialogClick(event) {
    if (event.target === addExerciseDialog) {
      closeAddExerciseDialog();
      return;
    }
    const target = event.target.closest("[data-action]");
    if (!target) {
      return;
    }
    if (target.dataset.action === "close-add-exercise") {
      closeAddExerciseDialog();
    }
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

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        currentUser = null;
        state = emptyState();
        activeLoadToken += 1;
        selectedExerciseId = null;
        editingExerciseId = null;
        render();
        return;
      }

      if (session && session.user) {
        currentUser = session.user;
        syncEntryFormModeFromUser();
        renderSettingsContent();
      }
    });

    let sessionResult;
    try {
      sessionResult = await withTimeout(
        supabaseClient.auth.getSession(),
        12000,
        "Could not check your sign-in session."
      );
    } catch (error) {
      handleSupabaseError(error);
      renderAuth();
      return;
    }

    const { data, error } = sessionResult;
    if (error) {
      handleSupabaseError(error);
      renderAuth();
      return;
    }

    currentUser = data.session ? data.session.user : null;
    if (currentUser) {
      syncEntryFormModeFromUser();
      await loadRemoteState();
    } else {
      render();
    }
  }

  document.addEventListener("submit", (event) => {
    if (event.target.id === "exercise-form") {
      handleAddExercise(event);
      return;
    }

    if (event.target.id === "entry-form") {
      handleAddEntry(event);
      return;
    }

    if (event.target.id === "exercise-edit-form") {
      handleEditExercise(event);
      return;
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

  moreButton.addEventListener("click", openActionsDialog);

  if (actionsDialog) {
    actionsDialog.addEventListener("click", handleSettingsClick);
    actionsDialog.addEventListener("close", () => {
      moreButton.setAttribute("aria-expanded", "false");
    });
    actionsDialog.addEventListener("change", (event) => {
      if (event.target.id === "import-input") {
        importData(event.target.files[0]);
      }
    });
  }

  if (addExerciseDialog) {
    addExerciseDialog.addEventListener("click", handleAddExerciseDialogClick);
  }

  if (addExerciseFab) {
    addExerciseFab.addEventListener("click", openAddExerciseDialog);
  }

  window.addEventListener("online", () => showToast("Online."));
  window.addEventListener("offline", () => showToast("Offline. Supabase data needs network."));

  prepareStartup().then((ready) => {
    if (ready) {
      bootstrap();
    }
  });
})();
