#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const STORAGE_BUCKET = "adventure-book-photos";

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  args._ = positional;
  return args;
}

function required(value, name) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function mappedUuid(map, oldId) {
  const key = String(oldId || "");
  if (!key) {
    return randomUUID();
  }
  if (!map.has(key)) {
    map.set(key, isUuid(key) ? key : randomUUID());
  }
  return map.get(key);
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sqliteJson(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });
  if (result.error) {
    throw new Error(`Could not run sqlite3. Install it or use --json instead. ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `sqlite3 exited with ${result.status}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : [];
}

function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return null;
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) {
    return null;
  }
  return {
    contentType: match[1] || "image/jpeg",
    buffer: Buffer.from(match[2], "base64"),
  };
}

function extensionForContentType(contentType) {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

async function throwIfError(result) {
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

async function uploadPhoto(supabase, bookId, photoId, buffer, contentType = "image/jpeg") {
  const storagePath = `${bookId}/${photoId}${extensionForContentType(contentType)}`;
  await throwIfError(await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    cacheControl: "3600",
    contentType,
    upsert: true,
  }));
  return storagePath;
}

async function upsertRows(supabase, table, rows, onConflict) {
  if (!rows.length) {
    return;
  }
  const size = 100;
  for (let index = 0; index < rows.length; index += size) {
    await throwIfError(await supabase
      .from(table)
      .upsert(rows.slice(index, index + size), { onConflict }));
  }
}

async function ensureBook(supabase, bookId, userId) {
  const existing = await supabase
    .from("adventure_books")
    .select("id")
    .eq("id", bookId)
    .maybeSingle();
  await throwIfError(existing);

  if (!existing.data) {
    await throwIfError(await supabase.from("adventure_books").insert({
      id: bookId,
      title: "Our Adventure Book",
      created_by: userId,
    }));
  }

  await throwIfError(await supabase.from("adventure_book_members").upsert({
    book_id: bookId,
    user_id: userId,
    role: "owner",
  }, { onConflict: "book_id,user_id" }));
}

async function importSqliteData({ supabase, bookId, dataDir }) {
  const dbPath = path.join(dataDir, "adventure_book.db");
  const photosDir = path.join(dataDir, "photos");
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Could not find SQLite database: ${dbPath}`);
  }

  const entries = sqliteJson(dbPath, "select * from entries order by created_at asc");
  const photos = sqliteJson(dbPath, "select * from photos order by position asc, created_at asc");
  const settings = sqliteJson(dbPath, "select * from settings order by key asc");

  const entryIdMap = new Map();
  const photoIdMap = new Map();
  const photoRows = [];

  for (const photo of photos) {
    const oldPhotoId = String(photo.id || "");
    const sourcePath = path.join(photosDir, `${oldPhotoId}.jpg`);
    if (!oldPhotoId || !fs.existsSync(sourcePath)) {
      console.warn(`Skipping missing photo file: ${sourcePath}`);
      continue;
    }
    const newPhotoId = mappedUuid(photoIdMap, oldPhotoId);
    const entryId = photo.entry_id ? mappedUuid(entryIdMap, photo.entry_id) : null;
    const storagePath = await uploadPhoto(supabase, bookId, newPhotoId, fs.readFileSync(sourcePath), "image/jpeg");
    photoRows.push({
      id: newPhotoId,
      book_id: bookId,
      storage_path: storagePath,
      entry_id: entryId,
      align: photo.align || "left",
      para: Number.isFinite(Number(photo.para)) ? Number(photo.para) : 0,
      comments: parseJson(photo.comments, []),
      position: Number.isFinite(Number(photo.position)) ? Number(photo.position) : 0,
      created_at: photo.created_at || new Date().toISOString(),
    });
  }

  const entryRows = entries.map((entry) => ({
    id: mappedUuid(entryIdMap, entry.id),
    book_id: bookId,
    template: entry.template || "scrapbook",
    title: entry.title || "",
    entry_date: entry.entry_date || "",
    caption: entry.caption || "",
    journal: entry.journal || "",
    theme: entry.theme || "Golden Hour",
    custom_theme: parseJson(entry.custom_theme, null),
    profile_photo_id: entry.profile_photo ? photoIdMap.get(String(entry.profile_photo)) || null : null,
    stickers: parseJson(entry.stickers, []),
    created_at: entry.created_at || new Date().toISOString(),
    updated_at: entry.updated_at || entry.created_at || new Date().toISOString(),
  }));

  const settingRows = settings
    .filter((setting) => setting.key)
    .map((setting) => {
      const value = String(setting.value || "");
      const mappedValue = photoIdMap.get(value) || value || null;
      return {
        book_id: bookId,
        key: setting.key,
        value: mappedValue,
      };
    });

  await upsertRows(supabase, "adventure_entries", entryRows, "id");
  await upsertRows(supabase, "adventure_photos", photoRows, "id");
  await upsertRows(supabase, "adventure_settings", settingRows, "book_id,key");

  return { entries: entryRows.length, photos: photoRows.length, settings: settingRows.length };
}

async function importJsonData({ supabase, bookId, file }) {
  if (!fs.existsSync(file)) {
    throw new Error(`Could not find JSON file: ${file}`);
  }

  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const entryIdMap = new Map();
  const photoRows = [];
  const entryRows = [];
  const settingRows = [];

  async function addDataUrlPhoto(dataUrl, attrs = {}) {
    const parsed = dataUrlToBuffer(dataUrl);
    if (!parsed) {
      return null;
    }
    const id = randomUUID();
    const storagePath = await uploadPhoto(supabase, bookId, id, parsed.buffer, parsed.contentType);
    photoRows.push({
      id,
      book_id: bookId,
      storage_path: storagePath,
      entry_id: attrs.entryId || null,
      align: attrs.align || "left",
      para: attrs.para ?? 0,
      comments: attrs.comments || [],
      position: attrs.position || 0,
    });
    return id;
  }

  if (raw.cover_image) {
    const coverId = await addDataUrlPhoto(raw.cover_image);
    if (coverId) {
      settingRows.push({ book_id: bookId, key: "cover_photo_id", value: coverId });
    }
  }

  for (const [name, dataUrl] of Object.entries(raw.avatars || {})) {
    const avatarId = await addDataUrlPhoto(dataUrl);
    if (avatarId) {
      settingRows.push({ book_id: bookId, key: `avatar:${name}`, value: avatarId });
    }
  }

  for (const entry of raw.entries || []) {
    const entryId = mappedUuid(entryIdMap, entry.id);
    let profilePhotoId = null;
    if (entry.profilePhoto) {
      profilePhotoId = await addDataUrlPhoto(entry.profilePhoto);
    }

    let position = 0;
    for (const photo of entry.photos || []) {
      const source = typeof photo === "string" ? photo : photo.src;
      const attrs = typeof photo === "string" ? {} : photo;
      await addDataUrlPhoto(source, {
        entryId,
        align: attrs.align || "left",
        para: attrs.para ?? 0,
        comments: attrs.comments || [],
        position,
      });
      position += 1;
    }

    entryRows.push({
      id: entryId,
      book_id: bookId,
      template: entry.template || "scrapbook",
      title: entry.title || "",
      entry_date: entry.date || entry.entry_date || "",
      caption: entry.caption || "",
      journal: entry.journal || "",
      theme: entry.theme || "Golden Hour",
      custom_theme: entry.customTheme || entry.custom_theme || null,
      profile_photo_id: profilePhotoId,
      stickers: entry.stickers || [],
    });
  }

  await upsertRows(supabase, "adventure_entries", entryRows, "id");
  await upsertRows(supabase, "adventure_photos", photoRows, "id");
  await upsertRows(supabase, "adventure_settings", settingRows, "book_id,key");

  return { entries: entryRows.length, photos: photoRows.length, settings: settingRows.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = required(process.env.SUPABASE_URL, "SUPABASE_URL");
  const serviceRoleKey = required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  const bookId = required(args["book-id"], "--book-id");
  const userId = required(args["user-id"], "--user-id");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  await ensureBook(supabase, bookId, userId);

  let result;
  if (args.json) {
    const file = typeof args.json === "string" ? args.json : args._[0];
    result = await importJsonData({ supabase, bookId, file: required(file, "--json file") });
  } else {
    const dataDir = typeof args["data-dir"] === "string" ? args["data-dir"] : args._[0];
    result = await importSqliteData({ supabase, bookId, dataDir: required(dataDir, "--data-dir path") });
  }

  console.log(`Imported ${result.entries} entries, ${result.photos} photos, and ${result.settings} settings.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
