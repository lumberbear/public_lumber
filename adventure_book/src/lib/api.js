import { compressImg, dataUrlToBlob } from "./compress.js";
import { STORAGE_BUCKET, supabase } from "./supabaseClient.js";

let activeBookId = null;

function requireBookId() {
  if (!activeBookId) {
    throw new Error("Choose or create an adventure book first.");
  }
  return activeBookId;
}

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function photoStoragePath(bookId, photoId) {
  return `${bookId}/${photoId}.jpg`;
}

function inviteCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function signedUrlMap(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const map = new Map();
  if (!uniquePaths.length) {
    return map;
  }

  const { data, error } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60);
  throwIfError(error);

  (data || []).forEach((item, index) => {
    map.set(uniquePaths[index], item.signedUrl || item.signedURL || "");
  });
  return map;
}

async function signedUrlForPath(path) {
  if (!path) {
    return null;
  }
  const { data, error } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  throwIfError(error);
  return data?.signedUrl || data?.signedURL || null;
}

async function deleteStoragePaths(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) {
    return;
  }
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(uniquePaths);
  throwIfError(error);
}

function photoFromRow(row, urlByPath) {
  return {
    id: row.id,
    src: urlByPath.get(row.storage_path) || "",
    align: row.align || "left",
    para: row.para ?? 0,
    comments: parseJson(row.comments, []),
  };
}

function entryFromRow(row, allPhotoRows, urlByPath) {
  const photos = allPhotoRows
    .filter((photo) => photo.entry_id === row.id)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((photo) => photoFromRow(photo, urlByPath));
  const profilePhoto = row.profile_photo_id
    ? allPhotoRows.find((photo) => photo.id === row.profile_photo_id)
    : null;

  return {
    id: row.id,
    template: row.template,
    title: row.title || "",
    date: row.entry_date || "",
    caption: row.caption || "",
    journal: row.journal || "",
    theme: row.theme || "Golden Hour",
    customTheme: parseJson(row.custom_theme, null),
    profilePhoto: profilePhoto ? urlByPath.get(profilePhoto.storage_path) || null : null,
    profilePhotoId: row.profile_photo_id || null,
    stickers: parseJson(row.stickers, []),
    photos,
  };
}

async function loadPhotoRows(bookId) {
  const { data, error } = await supabase
    .from("adventure_photos")
    .select("*")
    .eq("book_id", bookId);
  throwIfError(error);
  return data || [];
}

async function loadPhotoRowsWithUrls(bookId) {
  const rows = await loadPhotoRows(bookId);
  const urls = await signedUrlMap(rows.map((row) => row.storage_path));
  return { rows, urls };
}

async function saveUploadedPhoto(blob) {
  const bookId = requireBookId();
  const id = crypto.randomUUID();
  const storagePath = photoStoragePath(bookId, id);

  const upload = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    });
  throwIfError(upload.error);

  const { error } = await supabase.from("adventure_photos").insert({
    id,
    book_id: bookId,
    storage_path: storagePath,
    entry_id: null,
    align: "left",
    para: 0,
    comments: [],
    position: 0,
  });
  if (error) {
    await deleteStoragePaths([storagePath]).catch(() => {});
    throw error;
  }

  return {
    id,
    src: await signedUrlForPath(storagePath),
  };
}

export const api = {
  supabase,

  setActiveBookId(bookId) {
    activeBookId = bookId || null;
  },

  getActiveBookId() {
    return activeBookId;
  },

  async listBooks() {
    const { data, error } = await supabase
      .from("adventure_books")
      .select("id,title,created_at,updated_at")
      .order("created_at", { ascending: true });
    throwIfError(error);
    return data || [];
  },

  async createBook(title = "Our Adventure Book") {
    const { data, error } = await supabase.rpc("create_adventure_book", {
      book_title: title,
    });
    throwIfError(error);
    activeBookId = data;
    return data;
  },

  async createInvite() {
    const bookId = requireBookId();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    throwIfError(userError);
    const userId = userData?.user?.id;
    if (!userId) {
      throw new Error("Sign in first.");
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = inviteCode();
      const { error } = await supabase.from("adventure_book_invites").insert({
        book_id: bookId,
        code,
        created_by: userId,
      });
      if (!error) {
        return code;
      }
      if (error.code !== "23505") {
        throw error;
      }
    }

    throw new Error("Could not create a unique invite code.");
  },

  async joinBook(code) {
    const normalized = String(code || "").trim();
    if (!normalized) {
      throw new Error("Invite code is required.");
    }
    const { data, error } = await supabase.rpc("join_adventure_book", {
      invite_code: normalized,
    });
    throwIfError(error);
    activeBookId = data;
    return data;
  },

  async listEntries() {
    const bookId = requireBookId();
    const { data, error } = await supabase
      .from("adventure_entries")
      .select("*")
      .eq("book_id", bookId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    throwIfError(error);

    const { rows: photoRows, urls } = await loadPhotoRowsWithUrls(bookId);
    return (data || []).map((row) => entryFromRow(row, photoRows, urls));
  },

  async getEntry(id) {
    const bookId = requireBookId();
    const { data, error } = await supabase
      .from("adventure_entries")
      .select("*")
      .eq("book_id", bookId)
      .eq("id", id)
      .single();
    throwIfError(error);

    const { rows: photoRows, urls } = await loadPhotoRowsWithUrls(bookId);
    return entryFromRow(data, photoRows, urls);
  },

  async saveEntry(entry) {
    const bookId = requireBookId();
    const id = entry.id || crypto.randomUUID();
    const row = {
      id,
      book_id: bookId,
      template: entry.template || "scrapbook",
      title: entry.title || "",
      entry_date: entry.date || "",
      caption: entry.caption || "",
      journal: entry.journal || "",
      theme: entry.theme || "Golden Hour",
      custom_theme: entry.customTheme || null,
      profile_photo_id: entry.profilePhotoId || null,
      stickers: entry.stickers || [],
    };

    const saved = await supabase
      .from("adventure_entries")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    throwIfError(saved.error);

    const photos = (entry.photos || []).filter((photo) => photo.id);
    const incomingIds = new Set(photos.map((photo) => photo.id));
    const existing = await supabase
      .from("adventure_photos")
      .select("id,storage_path")
      .eq("book_id", bookId)
      .eq("entry_id", id);
    throwIfError(existing.error);

    const removed = (existing.data || []).filter((photo) => !incomingIds.has(photo.id));
    if (removed.length) {
      await deleteStoragePaths(removed.map((photo) => photo.storage_path));
      const removedIds = removed.map((photo) => photo.id);
      const deletion = await supabase
        .from("adventure_photos")
        .delete()
        .eq("book_id", bookId)
        .in("id", removedIds);
      throwIfError(deletion.error);
    }

    for (const [position, photo] of photos.entries()) {
      const update = await supabase
        .from("adventure_photos")
        .update({
          entry_id: id,
          align: photo.align || "left",
          para: photo.para ?? 0,
          comments: photo.comments || [],
          position,
        })
        .eq("book_id", bookId)
        .eq("id", photo.id);
      throwIfError(update.error);
    }

    return api.getEntry(id);
  },

  async deleteEntry(id) {
    const bookId = requireBookId();
    const photos = await supabase
      .from("adventure_photos")
      .select("id,storage_path")
      .eq("book_id", bookId)
      .eq("entry_id", id);
    throwIfError(photos.error);

    await deleteStoragePaths((photos.data || []).map((photo) => photo.storage_path));

    const photoDelete = await supabase
      .from("adventure_photos")
      .delete()
      .eq("book_id", bookId)
      .eq("entry_id", id);
    throwIfError(photoDelete.error);

    const entryDelete = await supabase
      .from("adventure_entries")
      .delete()
      .eq("book_id", bookId)
      .eq("id", id);
    throwIfError(entryDelete.error);
    return { ok: true };
  },

  async uploadPhotos(files) {
    const dataUrls = await Promise.all(files.map(compressImg));
    const uploaded = [];
    for (const dataUrl of dataUrls) {
      const blob = dataUrlToBlob(dataUrl);
      uploaded.push(await saveUploadedPhoto(blob));
    }
    return uploaded.map((photo, index) => ({ ...photo, dataUrl: dataUrls[index] }));
  },

  async uploadOnePhoto(file) {
    const [uploaded] = await api.uploadPhotos([file]);
    return uploaded;
  },

  async deletePhoto(id) {
    const bookId = requireBookId();
    const { data, error } = await supabase
      .from("adventure_photos")
      .select("storage_path")
      .eq("book_id", bookId)
      .eq("id", id)
      .single();
    throwIfError(error);

    await deleteStoragePaths([data.storage_path]);
    const deletion = await supabase
      .from("adventure_photos")
      .delete()
      .eq("book_id", bookId)
      .eq("id", id);
    throwIfError(deletion.error);
    return { ok: true };
  },

  async getPhotoUrl(id) {
    if (!id) {
      return null;
    }
    const bookId = requireBookId();
    const { data, error } = await supabase
      .from("adventure_photos")
      .select("storage_path")
      .eq("book_id", bookId)
      .eq("id", id)
      .single();
    throwIfError(error);
    return signedUrlForPath(data.storage_path);
  },

  async getSetting(key) {
    const bookId = requireBookId();
    const { data, error } = await supabase
      .from("adventure_settings")
      .select("value")
      .eq("book_id", bookId)
      .eq("key", key)
      .maybeSingle();
    throwIfError(error);
    return { key, value: data?.value || null };
  },

  async setSetting(key, value) {
    const bookId = requireBookId();
    if (value === null || value === undefined || value === "") {
      const deletion = await supabase
        .from("adventure_settings")
        .delete()
        .eq("book_id", bookId)
        .eq("key", key);
      throwIfError(deletion.error);
      return { ok: true };
    }

    const saved = await supabase
      .from("adventure_settings")
      .upsert({ book_id: bookId, key, value }, { onConflict: "book_id,key" });
    throwIfError(saved.error);
    return { ok: true };
  },

  async generatePalette() {
    return null;
  },
};
